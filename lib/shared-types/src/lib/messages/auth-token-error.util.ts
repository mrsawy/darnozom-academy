import { AuthErrors } from './auth-errors.enum';
import { CommonErrors } from './common-errors.enum';

/**
 * Prefix the RPC AuthGuard prepends to any auth failure that bubbles out of a
 * message handler, e.g. `auth-failed-tokenExpired`. Kept here so server, web,
 * and mobile all strip it the same way instead of hardcoding the literal.
 */
export const AUTH_FAILED_PREFIX = 'auth-failed-';

/** Removes the AuthGuard's `auth-failed-` wrapper if present. */
export function stripAuthFailedPrefix(message: string): string {
  return message.startsWith(AUTH_FAILED_PREFIX)
    ? message.slice(AUTH_FAILED_PREFIX.length)
    : message;
}

/**
 * True when an error means the *access token* is expired and the caller should
 * attempt a silent refresh + retry (proxy middleware, createAuthorizedNatsRequest,
 * mobile interceptors). Matches the shared {@link AuthErrors.TOKEN_EXPIRED} code
 * regardless of the AuthGuard's `auth-failed-` wrapping — never English prose.
 */
export function isAccessTokenExpiredError(message: string | null | undefined): boolean {
  if (!message) return false;
  return stripAuthFailedPrefix(message) === AuthErrors.TOKEN_EXPIRED;
}

/**
 * True when the *refresh token* itself is expired or revoked — refreshing is
 * pointless, the caller must send the user back to login.
 */
export function isRefreshTokenInvalidError(message: string | null | undefined): boolean {
  if (!message) return false;
  const code = stripAuthFailedPrefix(message);
  return code === AuthErrors.REFRESH_TOKEN_EXPIRED || code === AuthErrors.REFRESH_TOKEN_REVOKED;
}

/**
 * True when the caller has no usable session and should prompt sign-in
 * (missing token, unauthorized, invalid/expired access after refresh failed).
 * Never match English prose — only shared-types keys (and `auth-failed-` wrap).
 */
export function isUnauthenticatedError(message: string | null | undefined): boolean {
  if (!message) return false;
  if (message.startsWith(AUTH_FAILED_PREFIX)) return true;
  const code = stripAuthFailedPrefix(message);
  return (
    code === AuthErrors.AUTHENTICATION_REQUIRED ||
    code === AuthErrors.AUTHENTICATION_FAILED ||
    code === AuthErrors.TOKEN_INVALID ||
    code === AuthErrors.TOKEN_EXPIRED ||
    code === CommonErrors.UNAUTHORIZED
  );
}
