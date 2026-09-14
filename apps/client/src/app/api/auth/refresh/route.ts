import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  REFRESH_TOKEN_NAME,
  SESSION_ID_COOKIE_NAME,
} from '@islamic-academy/shared-types';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';
import { RefreshResponse } from '@/types/auth/auth.type';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Internal Route Handler consumed by proxy.ts for silent refresh.
 *
 * ASSUMPTION: the server exposes `POST /auth/refresh` accepting
 * `{ refreshToken }` and returning `{ access_token, refresh_token, sid, user }`.
 * Verify this shape against the server agent's final implementation.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_NAME)?.value;
  if (!refreshToken) {
    return new NextResponse(undefined, { status: 401 });
  }

  try {
    const response = await fetch(`${getPublicApiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return new NextResponse(undefined, { status: 401 });
    }

    const data = (await response.json()) as RefreshResponse;
    const isProduction = process.env.NODE_ENV === 'production';

    const res = NextResponse.json(data.user);
    res.cookies.set(AUTH_COOKIE_NAME, data.access_token, {
      httpOnly: isProduction,
      secure: isProduction,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
      path: '/',
    });
    res.cookies.set(REFRESH_TOKEN_NAME, data.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      path: '/',
    });
    res.cookies.set(SESSION_ID_COOKIE_NAME, data.sid, {
      httpOnly: false,
      secure: isProduction,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      path: '/',
    });

    return res;
  } catch {
    return new NextResponse(undefined, { status: 401 });
  }
}
