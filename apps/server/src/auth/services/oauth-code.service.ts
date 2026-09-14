import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthErrors } from '@islamic-academy/shared-types';

export interface OAuthCodePayload {
  access_token: string;
  refresh_token: string;
  sid: string;
  onboarding_required: boolean;
}

/** How long a one-time OAuth exchange code stays valid (60 seconds). */
const CODE_TTL_MS = 60_000;

/**
 * Short-lived, single-use code exchanged for the real tokens after a successful
 * Google OAuth redirect, so tokens never appear in the browser's address bar,
 * history, or referrer headers. In-memory store — fine for a single instance;
 * would need a shared store (Redis) behind a load balancer.
 */
@Injectable()
export class OAuthCodeService {
  private readonly codes = new Map<string, { payload: OAuthCodePayload; expiresAt: number }>();

  generate(payload: OAuthCodePayload): string {
    const code = randomUUID();
    this.codes.set(code, { payload, expiresAt: Date.now() + CODE_TTL_MS });
    return code;
  }

  exchange(code: string): OAuthCodePayload {
    const entry = this.codes.get(code);
    this.codes.delete(code);

    if (!entry || entry.expiresAt < Date.now()) {
      throw new UnauthorizedException(AuthErrors.TOKEN_INVALID);
    }

    return entry.payload;
  }
}
