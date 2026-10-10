import { redis } from '@/lib/redis/client';
import { connectToNats, request as natsRequest } from '@/lib/nats/client';
import { NextRequest, NextResponse } from 'next/server';
import { IUser } from '@/lib/types/user/user.interface';
import { Roles } from '@lms-organization/shared-types';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME, REFRESH_TOKEN_NAME, SESSION_ID_COOKIE_NAME } from '@/lib/data/constants';
import { parseDurationToSeconds } from '@/lib/utils';
import { RefreshResponse } from '@/lib/types/auth/auth.type';

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!authCookie) return new NextResponse(undefined, { status: 401 });
  const userString = await redis.get(`auth-${authCookie}`);
  let user: IUser | undefined;
  if (userString) {
    const cachedUser = JSON.parse(userString) as IUser;
    // Skip stale cache for GUEST users — they may have been promoted to STUDENT
    // via a payment webhook since the data was cached. Always re-fetch from DB.
    if (cachedUser.roleName !== Roles.GUEST && cachedUser.onboardingComplete !== false) {
      user = cachedUser;
    }
  }

  if (!user) {
    const natsClient = await connectToNats();
    const natsResponse = await natsRequest<{ message: string; user: IUser }>(
      natsClient,
      'user.getOwnData',
      JSON.stringify({
        id: randomUUID(),
        data: { authorization: authCookie },
      })
    );

    if ('err' in natsResponse) {
      // Access token invalid — attempt refresh
      const refreshCookie = request.cookies.get(REFRESH_TOKEN_NAME)?.value;
      if (refreshCookie) {
        const refreshResult = await attemptRefresh(natsClient, refreshCookie);
        if (refreshResult) {
          return refreshResult;
        }
      }
      return new NextResponse(natsResponse.err.message, { status: 401 });
    }
    user = natsResponse.user;
  }

  if (!user) return new NextResponse(undefined, { status: 401 });
  const response = new NextResponse(JSON.stringify(user));
  response.headers.set('Content-Type', 'application/json');

  void redis.set(`auth-${authCookie}`, JSON.stringify(user), 'EX', parseDurationToSeconds('1h'));

  return response;
}

async function attemptRefresh(
  natsClient: Awaited<ReturnType<typeof connectToNats>>,
  refreshToken: string
): Promise<NextResponse | null> {
  try {
    const refreshResponse = await natsRequest<RefreshResponse>(
      natsClient,
      'auth.refresh',
      JSON.stringify({
        id: randomUUID(),
        data: { refreshToken },
      })
    );

    if ('err' in refreshResponse) return null;

    const accessTtl = parseDurationToSeconds(
      process.env.ACCESS_TOKEN_EXPIRES_IN ?? process.env.AUTH_EXPIRES_IN ?? '15m'
    );
    const refreshTtl = parseDurationToSeconds(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d');
    const isProduction = process.env.NODE_ENV === 'production';

    void redis.set(
      `auth-${refreshResponse.access_token}`,
      JSON.stringify(refreshResponse.user),
      'EX',
      accessTtl
    );

    const res = NextResponse.json(refreshResponse.user);
    res.cookies.set(AUTH_COOKIE_NAME, refreshResponse.access_token, {
      httpOnly: isProduction,
      secure: isProduction,
      maxAge: accessTtl,
      path: '/',
    });
    res.cookies.set(REFRESH_TOKEN_NAME, refreshResponse.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      maxAge: refreshTtl,
      path: '/',
    });
    res.cookies.set(SESSION_ID_COOKIE_NAME, refreshResponse.sid, {
      httpOnly: false,
      secure: isProduction,
      maxAge: refreshTtl,
      path: '/',
    });

    return res;
  } catch {
    return null;
  }
}
