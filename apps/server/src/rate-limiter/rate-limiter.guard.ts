import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { CommonErrors, RATE_LIMIT } from '@darnozom/shared-types';
import { RateLimiterStore } from './rate-limiter.store';
import { RATE_LIMIT_KEY, SKIP_RATE_LIMIT_KEY, RateLimitOptions } from './rate-limiter.decorator';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private readonly store: RateLimiterStore,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (skip) return true;

    const overrides = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    const ttlSeconds = overrides?.ttlSeconds ?? RATE_LIMIT.GLOBAL.TTL_SECONDS;
    const maxRequests = overrides?.maxRequests ?? RATE_LIMIT.GLOBAL.MAX_REQUESTS;

    const key = this.buildKey(context);
    const result = this.store.hit(key, ttlSeconds, maxRequests);

    if (!result.allowed) {
      const seconds = Math.ceil(result.retryAfterMs / 1000);
      const message = `${CommonErrors.TOO_MANY_REQUESTS}|${seconds}`;

      if (context.getType() === 'rpc') {
        throw new RpcException(message);
      }
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private buildKey(context: ExecutionContext): string {
    const handler = context.getHandler().name;

    if (context.getType() === 'rpc') {
      const data: Record<string, unknown> = context.switchToRpc().getData() ?? {};
      const userId = this.extractUserIdFromRpcData(data);
      if (userId !== 'anon') {
        return `rpc:${userId}:${handler}`;
      }
      // Unauthenticated RPC flows (e.g. password reset) carry no user token.
      // Key by a per-target subject (email) so each account gets its own bucket
      // instead of every anonymous user on the platform sharing one global
      // `rpc:anon:<handler>` bucket (which would lock legitimate users out and
      // is a trivial DoS vector).
      const subject = this.extractAnonymousSubject(data);
      return `rpc:anon:${subject}:${handler}`;
    }

    const request = context.switchToHttp().getRequest<{ ip?: string; connection?: { remoteAddress?: string } }>();
    const ip: string = request.ip ?? request.connection?.remoteAddress ?? 'unknown';
    return `http:${ip}:${handler}`;
  }

  /**
   * Derive a stable per-target key for anonymous requests. Auth flows without a
   * user token (forgot/verify/reset password) always carry an `email`, which is
   * the right granularity to rate-limit on. Falls back to `unknown` so malformed
   * payloads still share a single conservative bucket.
   */
  private extractAnonymousSubject(data: Record<string, unknown>): string {
    const email = data.email;
    if (typeof email === 'string' && email.trim()) {
      return email.trim().toLowerCase();
    }
    return 'unknown';
  }

  /**
   * Extract user identity from the RPC data payload without depending on
   * AuthGuard. The NATS request carries an `authorization` JWT whose payload
   * contains `_id`. We decode (but don't verify -- AuthGuard does that) to
   * get a stable per-user key.
   */
  private extractUserIdFromRpcData(data: Record<string, unknown>): string {
    try {
      const token = data.authorization;
      if (typeof token !== 'string' || !token) return 'anon';
      const parts = token.split('.');
      if (parts.length !== 3) return 'anon';
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as { _id?: string };
      return payload._id ?? 'anon';
    } catch {
      return 'anon';
    }
  }
}
