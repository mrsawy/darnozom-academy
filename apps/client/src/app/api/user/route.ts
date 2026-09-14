import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@islamic-academy/shared-types';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';

/**
 * Internal Route Handler consumed by proxy.ts. Forwards the access-token
 * cookie to the NestJS server to resolve the authenticated user.
 *
 * The server exposes the "who am I" endpoint at `GET /user/me` (see
 * apps/server/src/user/controllers/http/user.controller.http.ts), not
 * `/auth/me` — there is no `/auth/me` route on the server.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) {
    return new NextResponse(undefined, { status: 401 });
  }

  try {
    const response = await fetch(`${getPublicApiUrl()}/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return new NextResponse(undefined, { status: 401 });
    }

    const user = await response.json();
    return NextResponse.json(user);
  } catch {
    return new NextResponse(undefined, { status: 401 });
  }
}
