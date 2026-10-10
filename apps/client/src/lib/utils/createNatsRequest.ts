'use server';

import { randomUUID } from 'node:crypto';
import { getCookie } from './serverUtils';
import { connectToNats, customizedRequest, request } from '@/lib/nats/client';
import NatsError from '../nats/error';
import { AUTH_COOKIE_NAME } from '../data/constants';
import {
  isNatsErrorResponse,
  isValidationErrorResponse,
  getValidationErrorMessage,
  type NatsErr,
} from './natsErrorHandler';
import { isAccessTokenExpiredError, AuthErrors } from '@lms-organization/shared-types';
import { clearAuthSession, refreshAuthTokens } from '../actions/auth/auth.action';

interface NatsRequestPayload<T = unknown> {
  id: string;
  data: T;
}

export type { NatsErr } from './natsErrorHandler';

// Utility functions
/**
 * Omitting `<R>` defaults `R` to `unknown` so the return type is `unknown | NatsErr`.
 * Call sites that need a concrete success shape should pass an explicit `R` generic.
 */
export async function createAuthorizedNatsRequest<R = unknown, T = unknown>(
  subject: string,
  data: Partial<T> = {},
  throwError = false
): Promise<R | NatsErr> {
  const natsClient = await connectToNats();
  let idToken = await getCookie(AUTH_COOKIE_NAME);

  // Access cookie is short-lived; public pages (e.g. /courses) skip proxy silent-refresh.
  // If it expired but the refresh cookie is still valid, rotate before failing.
  if (!idToken) {
    const refreshResult = await refreshAuthTokens();
    idToken = refreshResult?.access_token;
  }

  if (!idToken) {
    if (throwError) {
      throw new Error(AuthErrors.AUTHENTICATION_REQUIRED);
    }
    return { err: { message: AuthErrors.AUTHENTICATION_REQUIRED } };
  }

  const payload: NatsRequestPayload<Partial<T> & { authorization: string }> = {
    id: randomUUID(),
    data: {
      authorization: idToken,
      ...data,
    },
  };

  const response = await customizedRequest<R | { err: NatsError }>(
    natsClient,
    subject,
    JSON.stringify(payload),
    100_000
  );

  // Validation errors must be checked FIRST — their shape ({ err: [...] }) is also
  // matched by isNatsErrorResponse, which would then crash on .message.includes().
  if (isValidationErrorResponse(response)) {
    const message = getValidationErrorMessage(response.err);
    if (throwError) throw new Error(message);
    return { err: { message } };
  }

  if (isNatsErrorResponse(response)) {
    const errMsg: string = response.err?.message ?? '';
    // If the access token expired, attempt silent refresh and retry once. Keyed
    // off the shared AuthErrors.TOKEN_EXPIRED code (server/web/mobile), not prose.
    if (isAccessTokenExpiredError(errMsg)) {
      const refreshResult = await refreshAuthTokens();
      if (refreshResult) {
        // Retry the original request with the new token
        const retryPayload: NatsRequestPayload<Partial<T> & { authorization: string }> = {
          id: randomUUID(),
          data: {
            authorization: refreshResult.access_token,
            ...data,
          },
        };
        const retryResponse = await customizedRequest<R | { err: NatsError }>(
          natsClient,
          subject,
          JSON.stringify(retryPayload),
          100_000
        );
        if (isNatsErrorResponse(retryResponse)) {
          if (throwError) {
            throw new Error(retryResponse.err.message);
          }
          return { err: { message: retryResponse.err.message } };
        }
        return retryResponse as R;
      }
    }

    if (errMsg.startsWith('auth-failed-')) {
      // Drop access + refresh + session cookies so the UI cannot keep a stale
      // "logged in" state after single-session kick / revoked tokens.
      await clearAuthSession();
    }
    if (throwError) {
      throw new Error(errMsg);
    }
    return { err: { message: errMsg } };
  }

  return response as R;
}

export async function createNatsRequest<R = unknown, T = unknown>(
  subject: string,
  data: T,
  throwError = false
): Promise<R | NatsErr> {
  const natsClient = await connectToNats();

  const payload: NatsRequestPayload<T> = {
    id: randomUUID(),
    data: {
      ...data,
    },
  };

  const response = await request<R>(natsClient, subject, JSON.stringify(payload));

  if (isValidationErrorResponse(response)) {
    const message = getValidationErrorMessage(response.err);
    if (throwError) throw new Error(message);
    return { err: { message } };
  }

  if (isNatsErrorResponse(response)) {
    if (throwError) {
      throw new Error(response.err.message);
    }
    return { err: { message: response.err.message } };
  }

  return response;
}
