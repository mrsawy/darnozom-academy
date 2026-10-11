import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuthErrors } from '@darnozom/shared-types';

export interface OAuthCodePayload {
  access_token: string;
  refresh_token: string;
  sid: string;
  onboarding_required: boolean;
}

/**
 * Short-lived one-time exchange codes for OAuth token delivery.
 *
 * Instead of passing access/refresh tokens in the redirect URL (browser history,
 * server logs, referrer headers), the server stores a 60-second single-use code
 * and sends only that code in the redirect. The client immediately exchanges it
 * via POST /auth/oauth/exchange to receive the actual tokens over HTTPS body.
 */
@Injectable()
export class OAuthCodeService {
  private readonly codes = new Map<string, { payload: OAuthCodePayload; expiresAt: number }>();
  private readonly TTL_MS = 60_000;

  generate(payload: OAuthCodePayload): string {
    this.evictExpired();
    const code = randomBytes(32).toString('hex');
    this.codes.set(code, { payload, expiresAt: Date.now() + this.TTL_MS });
    return code;
  }

  exchange(code: string): OAuthCodePayload {
    this.evictExpired();
    const entry = this.codes.get(code);
    if (!entry || Date.now() > entry.expiresAt) {
      this.codes.delete(code);
      throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
    }
    this.codes.delete(code); // single-use
    return entry.payload;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.codes) {
      if (now > entry.expiresAt) this.codes.delete(key);
    }
  }
}
