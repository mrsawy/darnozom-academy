'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { redis } from '@/lib/redis/client';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IUser } from '@/lib/types/user/user.interface';

export async function completeOrganizationOnboardingAction() {
  const result = await createAuthorizedNatsRequest<
    { message: string; user: IUser } | { err: { message: string } }
  >('users.completeOrganizationOnboarding', {});

  if ('err' in result) return result;

  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (idToken) await redis.del(`auth-${idToken}`);

  return result;
}
