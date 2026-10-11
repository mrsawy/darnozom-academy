/* eslint-disable unicorn/prefer-string-raw */
/* eslint-disable no-console -- intentional diagnostics for local + Docker (EC2) server logs */

import { type NextRequest, NextResponse } from 'next/server';
import createI18nMiddleware from 'next-intl/middleware';
import { PUBLIC_PREFIX_ROUTES, PUBLIC_ROUTES } from '@/lib/route.config';
import { IUser } from './lib/types/user/user.interface';
import { AUTH_COOKIE_NAME, REFRESH_TOKEN_NAME, SESSION_ID_COOKIE_NAME } from './lib/data/constants';
import { getDashboardUrl } from './lib/utils/routes/getDashboardUrl';
import { Roles } from '@darnozom/shared-types';
import { ROUTE_ONBOARDING } from './lib/data/constants/routes.constants';

/** Greppable prefix for `docker logs` / local `pnpm dev` stdout */
const LOG_PREFIX = '[client:proxy]';

function getListenPort(): string {
  return process.env.PORT ?? '3000';
}

/**
 * Base URL for middleware → same-app Route Handlers (e.g. GET /api/user).
 * In Docker, `request.url` often uses host `0.0.0.0` (bind-all); that is not a valid outbound fetch target.
 * Optional override: INTERNAL_APP_ORIGIN=http://127.0.0.1:3000
 */
function getInternalAppOrigin(): string {
  const explicit = process.env.INTERNAL_APP_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  return `http://127.0.0.1:${getListenPort()}`;
}

/**
 * Origin for redirects (Location) — must match what the browser can open.
 * Prefer proxy headers from Caddy / reverse proxy.
 */
function getRedirectOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    const proto = forwardedProto && forwardedProto.length > 0 ? forwardedProto : 'https';
    return `${proto}://${host}`;
  }
  const url = new URL(request.url);
  if (url.hostname === '0.0.0.0' || url.hostname === '[::]' || url.hostname === '::') {
    return `http://localhost:${getListenPort()}`;
  }
  return url.origin;
}

function proxyLog(stage: string, details?: Record<string, string | number | boolean | undefined>) {
  const extra = details && Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : '';
  console.log(`${LOG_PREFIX} ${stage}${extra}`);
}

const i18nMiddleware = createI18nMiddleware({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localeDetection: false,
  localePrefix: 'always',
});

/** Bridges duplicate `next` type graphs (app vs hoisted) so next-intl accepts the request. */
type I18nMiddlewareRequest = Parameters<typeof i18nMiddleware>[0];

function toI18nMiddlewareRequest(request: NextRequest & { user?: IUser }): I18nMiddlewareRequest {
  return request as unknown as I18nMiddlewareRequest;
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_ROUTES.includes(`/${pathname}`)) {
    return true;
  } else if (PUBLIC_PREFIX_ROUTES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return false;
}

/**
 * Exchanges the refresh-token cookie for a fresh access token via the refresh
 * Route Handler. On success it copies the rotated cookies onto the outgoing
 * response and returns the user; otherwise returns null.
 */
async function trySilentRefresh(
  request: NextRequest,
  outgoingResponse: NextResponse,
  internalOrigin: string
): Promise<IUser | null> {
  const refreshTokenValue = request.cookies.get(REFRESH_TOKEN_NAME)?.value;
  if (!refreshTokenValue) {
    return null;
  }

  proxyLog('auth', { decision: 'attempting_refresh' });
  const refreshUrl = new URL('/api/auth/refresh', `${internalOrigin}/`);
  const refreshResponse = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      cookie: `${REFRESH_TOKEN_NAME}=${refreshTokenValue}`,
    },
  });

  if (!refreshResponse.ok) {
    proxyLog('auth', { decision: 'refresh_failed', status: refreshResponse.status });
    return null;
  }

  proxyLog('auth', { decision: 'refresh_success' });
  for (const cookieHeader of refreshResponse.headers.getSetCookie()) {
    outgoingResponse.headers.append('set-cookie', cookieHeader);
  }
  return (await refreshResponse.json()) as IUser;
}

export default async function proxy(request: NextRequest & { user?: IUser }) {
  try {
    const { pathname } = request.nextUrl;
    const pathWithoutLocale = pathname.replace(/^\/(ar|en)/, '');

    // Extract locale from pathname (defaults to 'ar' if not found)
    const localeMatch = pathname.match(/^\/(ar|en)/);
    const locale = localeMatch ? localeMatch[1] : 'ar';

    const isPublic = isPublicRoute(pathWithoutLocale);
    proxyLog('request', {
      method: request.method,
      pathname,
      pathWithoutLocale,
      locale,
      isPublic: isPublic ? 'true' : 'false',
    });

    // Redirect authenticated users away from /login and /signup to their dashboard
    const isAuthPage = pathWithoutLocale === '/login' || pathWithoutLocale === '/signup';
    if (isAuthPage && request.cookies.has(AUTH_COOKIE_NAME)) {
      proxyLog('branch', { decision: 'auth_page_with_cookie', pathname });
      const internalOrigin = getInternalAppOrigin();
      const apiUrl = new URL('/api/user', `${internalOrigin}/`);
      try {
        const userResp = await fetch(apiUrl, {
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=${request.cookies.get(AUTH_COOKIE_NAME)?.value}`,
          },
        });
        if (userResp.ok) {
          const contentType = userResp.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            const user = (await userResp.json()) as IUser;
            const dashboard = getDashboardUrl(user.roleName);
            proxyLog('response', { decision: 'redirect_authenticated_from_auth_page', dashboard });
            return NextResponse.redirect(
              new URL(`/${locale}${dashboard}`, `${getRedirectOrigin(request)}/`)
            );
          }
        }
      } catch {
        // If verification fails, let them through to the login/signup page
        proxyLog('branch', { decision: 'auth_page_verify_failed_continue' });
      }
    }

    if (isPublic) {
      proxyLog('branch', { decision: 'public_route', pathname });
      const response = i18nMiddleware(toI18nMiddlewareRequest(request));
      // Set pathname header for use in server actions
      response.headers.set('x-pathname', pathname);
      proxyLog('response', { decision: 'public_i18n_continue', pathname });
      return response;
    }

    proxyLog('branch', { decision: 'protected_route', pathname });

    const i18nResponse = i18nMiddleware(toI18nMiddlewareRequest(request));
    // Set pathname header for use in server actions
    i18nResponse.headers.set('x-pathname', pathname);

    const redirectBase = `${getRedirectOrigin(request)}/`;
    const internalOrigin = getInternalAppOrigin();
    const hasAuthCookie = request.cookies.has(AUTH_COOKIE_NAME);

    proxyLog('auth', {
      hasAuthCookie: hasAuthCookie ? 'true' : 'false',
      cookieName: AUTH_COOKIE_NAME,
    });

    let resolvedUser: IUser | null = null;

    if (hasAuthCookie) {
      const apiUrl = new URL('/api/user', `${internalOrigin}/`);
      proxyLog('fetch_user', {
        apiPath: apiUrl.pathname,
        fetchHost: apiUrl.host,
        internalOriginUsed: internalOrigin,
      });

      const response = await fetch(apiUrl, {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${request.cookies.get(AUTH_COOKIE_NAME)?.value}`,
        },
      });

      const contentType = response.headers.get('content-type') ?? '';
      proxyLog('fetch_user_result', {
        status: response.status,
        ok: response.ok ? 'true' : 'false',
        contentTypeSample: contentType.slice(0, 80),
      });

      if (response.ok) {
        if (contentType.includes('application/json')) {
          resolvedUser = (await response.json()) as IUser;
          proxyLog('response', {
            decision: 'authenticated_continue',
            userIdPresent: resolvedUser?._id ? 'true' : 'false',
          });
        } else {
          // A 200 without JSON means the session is no longer valid.
          proxyLog('response', { decision: 'redirect_login_non_json', locale });
          return NextResponse.redirect(new URL(`/${locale}/login`, redirectBase));
        }
      }
      // A non-ok status falls through to the silent-refresh attempt below.
    }

    // No access cookie, or the access token was rejected. The access cookie
    // expires with the short-lived JWT while the refresh cookie lives for days,
    // so this is what keeps a session alive between logins.
    resolvedUser ??= await trySilentRefresh(request, i18nResponse, internalOrigin);

    if (!resolvedUser) {
      proxyLog('response', { decision: 'redirect_login_no_session', locale });
      const redirectResponse = NextResponse.redirect(new URL(`/${locale}/login`, redirectBase));
      redirectResponse.cookies.delete(AUTH_COOKIE_NAME);
      redirectResponse.cookies.delete(REFRESH_TOKEN_NAME);
      redirectResponse.cookies.delete(SESSION_ID_COOKIE_NAME);
      return redirectResponse;
    }

    request.user = resolvedUser;

    // GUEST users (post-Google-OAuth) must complete onboarding before anything else.
    const isGuestOnboarding =
      resolvedUser.roleName === Roles.GUEST || resolvedUser.onboardingComplete === false;
    if (isGuestOnboarding && !pathWithoutLocale.startsWith(ROUTE_ONBOARDING)) {
      proxyLog('response', { decision: 'redirect_onboarding', pathname });
      return NextResponse.redirect(new URL(`/${locale}${ROUTE_ONBOARDING}`, redirectBase));
    }

    return i18nResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    proxyLog('error', { message, pathname: request.nextUrl.pathname });
    // Redirect to localized login page (fallback to 'ar')
    const localeMatch = request.nextUrl.pathname.match(/^\/(ar|en)/);
    const locale = localeMatch ? localeMatch[1] : 'ar';
    const redirectBase = `${getRedirectOrigin(request)}/`;
    proxyLog('response', { decision: 'redirect_login_after_error', locale });
    return NextResponse.redirect(new URL(`/${locale}/login`, redirectBase));
  }
}

export const config = {
  // Only run middleware on page routes (not static assets or API routes)
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next (Next.js internals)
     * - Static files (images, fonts, etc.)
     */
    '/((?!api|_next|.*\\..*).*)',
  ],
};
