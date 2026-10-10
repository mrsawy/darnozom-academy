import { type NextRequest, NextResponse } from 'next/server';
import createI18nMiddleware from 'next-intl/middleware';
import { Roles } from '@islamic-academy/shared-types';
import { PUBLIC_PREFIX_ROUTES, PUBLIC_ROUTES } from '@/lib/route.config';
import { IUser } from '@/types/user/user.interface';
import {
  AUTH_COOKIE_NAME,
  REFRESH_TOKEN_NAME,
  SESSION_ID_COOKIE_NAME,
  ROUTE_ONBOARDING,
} from '@/lib/data/constants';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';

/** Greppable prefix for stdout during local `pnpm dev`. */
const LOG_PREFIX = '[client:middleware]';

function middlewareLog(stage: string, details?: Record<string, string | number | boolean | undefined>) {
  const extra = details && Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : '';
  console.log(`${LOG_PREFIX} ${stage}${extra}`);
}

const i18nMiddleware = createI18nMiddleware({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localeDetection: false,
  localePrefix: 'always',
});

/** Bridges duplicate `next` type graphs so next-intl accepts the request. */
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
 * Exchanges the refresh-token cookie for a fresh access token via the internal
 * refresh Route Handler. On success it copies the rotated cookies onto the
 * outgoing response and returns the user; otherwise returns null.
 */
async function trySilentRefresh(
  request: NextRequest,
  outgoingResponse: NextResponse
): Promise<IUser | null> {
  const refreshTokenValue = request.cookies.get(REFRESH_TOKEN_NAME)?.value;
  if (!refreshTokenValue) {
    return null;
  }

  middlewareLog('auth', { decision: 'attempting_refresh' });
  const refreshUrl = new URL('/api/auth/refresh', request.url);
  const refreshResponse = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      cookie: `${REFRESH_TOKEN_NAME}=${refreshTokenValue}`,
    },
  });

  if (!refreshResponse.ok) {
    middlewareLog('auth', { decision: 'refresh_failed', status: refreshResponse.status });
    return null;
  }

  middlewareLog('auth', { decision: 'refresh_success' });
  for (const cookieHeader of refreshResponse.headers.getSetCookie()) {
    outgoingResponse.headers.append('set-cookie', cookieHeader);
  }
  return (await refreshResponse.json()) as IUser;
}

export default async function middleware(request: NextRequest & { user?: IUser }) {
  try {
    const { pathname } = request.nextUrl;
    const pathWithoutLocale = pathname.replace(/^\/(ar|en)/, '') || '/';

    const localeMatch = pathname.match(/^\/(ar|en)/);
    const locale = localeMatch ? localeMatch[1] : 'ar';

    const isPublic = isPublicRoute(pathWithoutLocale);
    middlewareLog('request', {
      method: request.method,
      pathname,
      pathWithoutLocale,
      locale,
      isPublic: isPublic ? 'true' : 'false',
    });

    // Redirect authenticated users away from /login and /signup to their dashboard
    const isAuthPage = pathWithoutLocale === '/login' || pathWithoutLocale === '/signup';
    if (isAuthPage && request.cookies.has(AUTH_COOKIE_NAME)) {
      middlewareLog('branch', { decision: 'auth_page_with_cookie', pathname });
      const apiUrl = new URL('/api/user', request.url);
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
            middlewareLog('response', { decision: 'redirect_authenticated_from_auth_page', dashboard });
            return NextResponse.redirect(new URL(`/${locale}${dashboard}`, request.url));
          }
        }
      } catch {
        // If verification fails, let them through to the login/signup page
        middlewareLog('branch', { decision: 'auth_page_verify_failed_continue' });
      }
    }

    if (isPublic) {
      middlewareLog('branch', { decision: 'public_route', pathname });
      const response = i18nMiddleware(toI18nMiddlewareRequest(request));
      response.headers.set('x-pathname', pathname);
      return response;
    }

    middlewareLog('branch', { decision: 'protected_route', pathname });

    const i18nResponse = i18nMiddleware(toI18nMiddlewareRequest(request));
    i18nResponse.headers.set('x-pathname', pathname);

    const hasAuthCookie = request.cookies.has(AUTH_COOKIE_NAME);

    middlewareLog('auth', {
      hasAuthCookie: hasAuthCookie ? 'true' : 'false',
      cookieName: AUTH_COOKIE_NAME,
    });

    let resolvedUser: IUser | null = null;

    if (hasAuthCookie) {
      const apiUrl = new URL('/api/user', request.url);
      const response = await fetch(apiUrl, {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${request.cookies.get(AUTH_COOKIE_NAME)?.value}`,
        },
      });

      const contentType = response.headers.get('content-type') ?? '';
      middlewareLog('fetch_user_result', {
        status: response.status,
        ok: response.ok ? 'true' : 'false',
      });

      if (response.ok) {
        if (contentType.includes('application/json')) {
          resolvedUser = (await response.json()) as IUser;
        } else {
          middlewareLog('response', { decision: 'redirect_login_non_json', locale });
          return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
        }
      }
      // A non-ok status falls through to the silent-refresh attempt below.
    }

    // No access cookie, or the access token was rejected. The access cookie
    // expires with the short-lived JWT while the refresh cookie lives for days,
    // so this is what keeps a session alive between logins.
    resolvedUser ??= await trySilentRefresh(request, i18nResponse);

    if (!resolvedUser) {
      middlewareLog('response', { decision: 'redirect_login_no_session', locale });
      const redirectResponse = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
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
      middlewareLog('response', { decision: 'redirect_onboarding', pathname });
      return NextResponse.redirect(new URL(`/${locale}${ROUTE_ONBOARDING}`, request.url));
    }

    return i18nResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    middlewareLog('error', { message, pathname: request.nextUrl.pathname });
    const localeMatch = request.nextUrl.pathname.match(/^\/(ar|en)/);
    const locale = localeMatch ? localeMatch[1] : 'ar';
    middlewareLog('response', { decision: 'redirect_login_after_error', locale });
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
