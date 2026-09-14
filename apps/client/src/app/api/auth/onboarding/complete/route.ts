import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@islamic-academy/shared-types';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';

/**
 * ASSUMPTION: `POST /auth/onboarding/complete` (bearer-authenticated) accepts
 * `{ roleName, phone, organizationDto? }` and returns the updated user.
 * Verify against the server agent's final DTO.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${getPublicApiUrl()}/auth/onboarding/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorBody.message ?? 'Onboarding failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Onboarding failed' }, { status: 500 });
  }
}
