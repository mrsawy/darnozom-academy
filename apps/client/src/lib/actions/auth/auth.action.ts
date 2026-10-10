'use server';

import { redis } from '@/lib/redis/client';
import { redirect } from 'next/navigation';
import { LoginSchema, SignupSchema } from '@/lib/schema/authSchema';
import { getPreferredCurrency } from '@/lib/utils/getPreferredCurrency';
import { UserMainRoles } from '@/lib/data/userRole.enum';
import { getCookie, removeCookie, setCookie } from '@/lib/utils/serverUtils';
import { RefreshResponse, RegisterResponse } from '@/lib/types/auth/auth.type';
import { AUTH_COOKIE_NAME, REFRESH_TOKEN_NAME, SESSION_ID_COOKIE_NAME } from '@/lib/data/constants';
import { parseDurationToSeconds } from '@/lib/utils';
import {
  createAuthorizedNatsRequest,
  createNatsRequest,
  type NatsErr,
} from '@/lib/utils/createNatsRequest';
import { IUser } from '@/lib/types/user/user.interface';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';
import { AuthErrors, type Currency } from '@lms-organization/shared-types';

// ─── Public (unauthenticated) helpers ──────────────────────────────────────

export async function handleSignup(
  signUpData: SignupSchema,
  wishlistCourseIds?: string[]
): Promise<RegisterResponse | NatsErr> {
  const {
    username,
    roleName,
    email,
    phoneNumber,
    password,
    firstName,
    lastName,
    country,
    organizationName,
    organizationSlug,
    acceptedTerms,
  } = signUpData;
  const preferredCurrency = getPreferredCurrency(country);

  // STUDENT | PARENT come through as-is; everything else becomes SUPER_ADMIN.
  const isOrg = roleName !== UserMainRoles.STUDENT && roleName !== UserMainRoles.PARENT;
  const serverRoleName = isOrg ? 'SUPER_ADMIN' : roleName;

  const userDto = {
    username,
    roleName: serverRoleName,
    email,
    phone: phoneNumber,
    password,
    firstName,
    lastName,
    preferredCurrency,
    profile: { address: { country } },
  };

  const organizationDto = isOrg ? { name: organizationName, slug: organizationSlug } : undefined;

  const data = {
    userDto,
    ...(organizationDto ? { organizationDto } : {}),
    ...(isOrg ? { acceptedTerms: acceptedTerms === true } : {}),
    ...(wishlistCourseIds && wishlistCourseIds.length > 0 ? { wishlistCourseIds } : {}),
  };

  const response = await createNatsRequest<RegisterResponse>('auth.register', data);

  if ('err' in response) return response;
  await setAuthCookies(response);
  return response;
}

export async function handleLogin(loginData: LoginSchema): Promise<IUser | NatsErr> {
  const response = await createNatsRequest<RegisterResponse>('auth.login', loginData);

  if ('err' in response) return response;
  await setAuthCookies(response);
  return response.user;
}

/** Clears auth cookies + Redis cache without redirecting. */
export async function clearAuthSession() {
  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (idToken) {
    await redis.del(`auth-${idToken}`);
  }
  await removeCookie(AUTH_COOKIE_NAME);
  await removeCookie(REFRESH_TOKEN_NAME);
  await removeCookie(SESSION_ID_COOKIE_NAME);
}

export async function logout(redirectAfterLogin = true) {
  await clearAuthSession();
  if (redirectAfterLogin) {
    redirect('/');
  }
}

export async function forgotPassword(email: string): Promise<{ message: string } | NatsErr> {
  const response = await createNatsRequest<{ message: string }>('auth.forgotPassword', { email });
  return response;
}

export async function resetPassword(
  token: string,
  email: string,
  newPassword: string
): Promise<{ message: string } | NatsErr> {
  const response = await createNatsRequest<{ message: string }>('auth.resetPassword', {
    token,
    email,
    newPassword,
  });
  return response;
}

// ─── OAuth callback ─────────────────────────────────────────────────────────

/**
 * Called from the /oauth/callback page after Google redirects back.
 *
 * The server now issues a short-lived one-time `oauth_code` in the redirect URL
 * instead of the actual tokens (which would appear in browser history and logs).
 * We exchange that code with the server here (over HTTPS body) to get the tokens,
 * then fetch the user profile via NATS and store everything in httpOnly cookies.
 */
export async function handleOAuthCallback(params: {
  oauth_code: string;
}): Promise<RegisterResponse | NatsErr> {
  const { oauth_code } = params;

  if (!oauth_code) {
    return { err: { message: 'Invalid OAuth callback parameters' } };
  }

  // Exchange the one-time code for tokens (tokens never touch the URL).
  let tokenPayload: {
    access_token: string;
    refresh_token: string;
    sid: string;
    onboarding_required: boolean;
  };
  try {
    const res = await fetch(`${getPublicApiUrl()}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oauth_code }),
    });
    if (!res.ok) return { err: { message: 'OAuth code exchange failed' } };
    tokenPayload = (await res.json()) as typeof tokenPayload;
  } catch {
    return { err: { message: 'OAuth code exchange failed' } };
  }

  const { access_token, refresh_token, sid } = tokenPayload;

  // Resolve the user via NATS — passes authorization in the payload so
  // AuthGuard can verify the JWT without reading from a cookie.
  const userResponse = await createNatsRequest<{ message: string; user: IUser }>(
    'user.getOwnData',
    { authorization: access_token }
  );

  if ('err' in userResponse) return userResponse;

  const fullResponse: RegisterResponse = {
    access_token,
    refresh_token,
    sid,
    user: userResponse.user,
  };

  await setAuthCookies(fullResponse);
  return fullResponse;
}

// ─── Onboarding (authenticated) ─────────────────────────────────────────────

/**
 * Completes the onboarding step for a freshly-created Google OAuth user
 * (GUEST role → chosen role, adds phone, optional org).
 *
 * Uses `createAuthorizedNatsRequest` — reads the JWT from the auth cookie,
 * so it must be called after handleOAuthCallback has set the cookies.
 */
export async function completeOnboarding(data: {
  roleName: string;
  phone: string;
  preferredCurrency?: Currency;
  firstName?: string;
  lastName?: string;
  organizationDto?: { name: string; slug: string };
  acceptedTerms?: boolean;
}): Promise<{ message: string } | NatsErr> {
  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (!idToken) return { err: { message: AuthErrors.AUTHENTICATION_REQUIRED } };

  const result = await createAuthorizedNatsRequest<{ message: string }>(
    'auth.completeOnboarding',
    data
  );

  if ('err' in result) return result;

  // Invalidate cached user so the next getAuthUser() fetches the updated profile.
  await redis.del(`auth-${idToken}`);
  return result;
}

// ─── Token refresh ───────────────────────────────────────────────────────────

export async function refreshAuthTokens(): Promise<RefreshResponse | null> {
  try {
    const refreshToken = await getCookie(REFRESH_TOKEN_NAME);
    if (!refreshToken) return null;

    const response = await createNatsRequest<RefreshResponse>('auth.refresh', { refreshToken });

    if ('err' in response) return null;

    await setAuthCookies(response);
    return response;
  } catch {
    return null;
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

async function setAuthCookies(response: RegisterResponse | RefreshResponse) {
  const accessTtl = parseDurationToSeconds(
    process.env.ACCESS_TOKEN_EXPIRES_IN ?? process.env.AUTH_EXPIRES_IN ?? '15m'
  );
  const refreshTtl = parseDurationToSeconds(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d');
  const isProduction = process.env.NODE_ENV === 'production';

  await redis.set(`auth-${response.access_token}`, JSON.stringify(response.user), 'EX', accessTtl);

  await setCookie(AUTH_COOKIE_NAME, response.access_token, {
    httpOnly: true,
    secure: isProduction,
    maxAge: accessTtl,
    path: '/',
  });
  await setCookie(REFRESH_TOKEN_NAME, response.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    maxAge: refreshTtl,
    path: '/',
  });
  await setCookie(SESSION_ID_COOKIE_NAME, response.sid, {
    httpOnly: false,
    secure: isProduction,
    maxAge: refreshTtl,
    path: '/',
  });
}
