import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  REFRESH_TOKEN_NAME,
  SESSION_ID_COOKIE_NAME,
} from '@/lib/data/constants';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

interface OAuthTokenPayload {
  access_token: string;
  refresh_token: string;
  sid: string;
  user: Record<string, unknown>;
}

/**
 * Exchanges the one-time `oauth_code` (from the Google OAuth redirect) for
 * tokens via the NestJS server, then sets httpOnly cookies.
 *
 * ASSUMPTION: `POST /auth/oauth/exchange` accepts `{ oauth_code }` and
 * returns `{ access_token, refresh_token, sid, user }`. Verify against the
 * server agent's final implementation.
 */
export async function POST(request: NextRequest) {
  try {
    const { oauth_code: oauthCode } = await request.json();
    if (!oauthCode) {
      return NextResponse.json({ message: 'Invalid OAuth callback parameters' }, { status: 400 });
    }

    const response = await fetch(`${getPublicApiUrl()}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oauth_code: oauthCode }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ message: 'OAuth code exchange failed' }, { status: response.status });
    }

    const data = (await response.json()) as OAuthTokenPayload;
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
    return NextResponse.json({ message: 'OAuth code exchange failed' }, { status: 500 });
  }
}
