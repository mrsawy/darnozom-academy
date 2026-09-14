import { cookies, headers } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@islamic-academy/shared-types';
import { IUser } from '@/types/user/user.interface';

/**
 * Server-side helper for use in Server Components / layouts. Reads the
 * access-token cookie and calls this app's own `/api/user` Route Handler
 * (proxy.ts has already validated the session by the time a protected
 * layout renders, so this is expected to succeed).
 */
export async function getAuthUser(): Promise<IUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) return null;

  const headerList = await headers();
  const host = headerList.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const origin = process.env.INTERNAL_APP_ORIGIN ?? `${protocol}://${host}`;

  try {
    const response = await fetch(`${origin}/api/user`, {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as IUser;
  } catch {
    return null;
  }
}
