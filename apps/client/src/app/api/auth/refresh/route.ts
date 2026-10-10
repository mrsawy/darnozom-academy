import { NextRequest, NextResponse } from 'next/server';
import { connectToNats, request as natsRequest } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { redis } from '@/lib/redis/client';
import { AUTH_COOKIE_NAME, REFRESH_TOKEN_NAME, SESSION_ID_COOKIE_NAME } from '@/lib/data/constants';
import { parseDurationToSeconds } from '@/lib/utils';
import { RefreshResponse } from '@/lib/types/auth/auth.type';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_NAME)?.value;
  if (!refreshToken) {
    return new NextResponse(undefined, { status: 401 });
  }

  try {
    const natsClient = await connectToNats();
    const response = await natsRequest<RefreshResponse>(
      natsClient,
      'auth.refresh',
      JSON.stringify({
        id: randomUUID(),
        data: { refreshToken },
      })
    );

    if ('err' in response) {
      return new NextResponse(undefined, { status: 401 });
    }

    const accessTtl = parseDurationToSeconds(
      process.env.ACCESS_TOKEN_EXPIRES_IN ?? process.env.AUTH_EXPIRES_IN ?? '15m'
    );
    const refreshTtl = parseDurationToSeconds(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d');
    const isProduction = process.env.NODE_ENV === 'production';

    void redis.set(`auth-${response.access_token}`, JSON.stringify(response.user), 'EX', accessTtl);

    const res = NextResponse.json(response.user);

    res.cookies.set(AUTH_COOKIE_NAME, response.access_token, {
      httpOnly: isProduction,
      secure: isProduction,
      maxAge: accessTtl,
      path: '/',
    });
    res.cookies.set(REFRESH_TOKEN_NAME, response.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      maxAge: refreshTtl,
      path: '/',
    });
    res.cookies.set(SESSION_ID_COOKIE_NAME, response.sid, {
      httpOnly: false,
      secure: isProduction,
      maxAge: refreshTtl,
      path: '/',
    });

    return res;
  } catch {
    return new NextResponse(undefined, { status: 401 });
  }
}
