import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, REFRESH_TOKEN_NAME, SESSION_ID_COOKIE_NAME } from '@/lib/data/constants';
import { redis } from '@/lib/redis/client';

/**
 * Route handler to clean up invalid authentication cookies.
 * This can be called from Server Components via redirect when auth fails.
 */
export async function GET(request: NextRequest) {
  const idToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Remove from Redis if exists
  if (idToken) {
    await redis.del(`auth-${idToken}`);
  }

  // Remove all auth cookies
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(REFRESH_TOKEN_NAME);
  cookieStore.delete(SESSION_ID_COOKIE_NAME);

  // Get redirect URL from query parameter, referer, or default to home
  const searchParams = request.nextUrl.searchParams;
  let redirectPath = searchParams.get('redirect');

  // If no redirect param, try to get from referer header
  // The referer should point to the original page that called getAuthUser()
  if (redirectPath) {
    // Decode the redirect path if it was encoded
    try {
      redirectPath = decodeURIComponent(redirectPath);
    } catch {
      // If decoding fails, use as is
    }
  } else {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        // Extract pathname and search params
        redirectPath = refererUrl.pathname + refererUrl.search;

        // If referer is the cleanup route itself, fallback to home
        if (redirectPath.startsWith('/api/auth/cleanup')) {
          redirectPath = '/';
        }
      } catch {
        // If parsing fails, fallback to home
        redirectPath = '/';
      }
    } else {
      // Try alternative headers that Next.js might set
      const invokePath = request.headers.get('x-invoke-path');
      redirectPath = invokePath ?? '/';
    }
  }

  // Ensure path starts with /
  if (!redirectPath.startsWith('/')) {
    redirectPath = '/' + redirectPath;
  }

  // Build redirect URL using the same origin
  const baseUrl = new URL(request.url);
  const redirectUrl = new URL(redirectPath, `${baseUrl.protocol}//${baseUrl.host}`);

  return NextResponse.redirect(redirectUrl);
}
