import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  REFRESH_TOKEN_NAME,
  SESSION_ID_COOKIE_NAME,
} from '@/lib/data/constants';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';
import { RegisterResponse } from '@/types/auth/auth.type';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Internal Route Handler called by the login form. Calls the NestJS server's
 * `/auth/login`, then sets httpOnly cookies on the browser so the middleware
 * and other Route Handlers can read them.
 *
 * ASSUMPTION: `POST /auth/login` accepts `{ identifier, password }` (email or
 * username) and returns `{ access_token, refresh_token, sid, user }`.
 * Verify this shape against the server agent's final implementation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${getPublicApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorBody.message ?? 'Login failed' },
        { status: response.status }
      );
    }

    const data = (await response.json()) as RegisterResponse;
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
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
