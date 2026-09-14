import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  REFRESH_TOKEN_NAME,
  SESSION_ID_COOKIE_NAME,
} from '@islamic-academy/shared-types';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';
import { RegisterResponse } from '@/types/auth/auth.type';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Proxies to the server's `POST /auth/register`, which expects
 * `{ userDto: { firstName, lastName, email, username, password, roleName }, organizationDto?, acceptedTerms? }`
 * (see RegisterDto/CreateUserDto) and returns `{ access_token, refresh_token, sid, user }`.
 * The request body is forwarded as-is; the caller (signup form) is responsible
 * for shaping it into RegisterRequestBody.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${getPublicApiUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorBody.message ?? 'Registration failed' },
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
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 });
  }
}
