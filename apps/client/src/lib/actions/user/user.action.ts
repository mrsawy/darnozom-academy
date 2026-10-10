'use server';

import { deleteFromS3, getCookie } from '@/lib/utils/serverUtils';
import { redis } from '@/lib/redis/client';
import { randomUUID } from 'node:crypto';
import { IUser } from '@/lib/types/user/user.interface';
import { connectToNats, request as natsRequest } from '@/lib/nats/client';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { CreateUserFormData, EditUserFormData } from '@/lib/schema/user.schema';
import { uploadFile } from '@/lib/utils/uploadFile';
import { slugify } from '@/lib/utils/slugify';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { getPreferredCurrency } from '@/lib/utils/getPreferredCurrency';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { parseDurationToSeconds } from '@/lib/utils';
import { CreateUserDto } from '@lms-organization/shared-types/dto';

/**
 * Gets the current authenticated user (server-only: cookie → Redis → NATS).
 * From client components, prefer getAuthUserWithCache() to use persisted user from localStorage first.
 */
export async function getAuthUser() {
  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (!idToken) return;

  const cachedUserString = await redis.get(`auth-${idToken}`);
  if (cachedUserString) {
    const user = JSON.parse(cachedUserString) as IUser;
    return user;
  }

  const natsClient = await connectToNats();
  const response = await natsRequest<
    { message: string; user: IUser } | { err: { message: string } }
  >(
    natsClient,
    'user.getOwnData',
    JSON.stringify({
      id: randomUUID(),
      data: { authorization: idToken },
    })
  );

  if ('err' in response) {
    // Remove invalid token from Redis
    if (idToken) {
      await redis.del(`auth-${idToken}`);
    }
    // Get current pathname from x-pathname header (set by middleware)
    const headersList = await headers();
    const currentPath = headersList.get('x-pathname') ?? '/';

    // Redirect to cleanup route handler which can modify cookies
    // Route handlers can modify cookies, unlike Server Components
    // Pass the pathname as a query parameter
    redirect(`/api/auth/cleanup?redirect=${encodeURIComponent(currentPath)}`);
  }
  const user = (response as { message: string; user: IUser }).user;
  await redis.set(`auth-${idToken}`, JSON.stringify(user), 'EX', parseDurationToSeconds('10m'));

  return user;
}

export async function createUserAction(userData: CreateUserFormData) {
  let avatarUrl;
  try {
    if (userData.profile?.avatarFile instanceof File) {
      const fileExtension = userData.profile?.avatarFile.name.split('.').pop() ?? 'jpg';
      avatarUrl = await uploadFile(
        await userData.profile?.avatarFile.arrayBuffer(),
        `users/avatars/${slugify(userData.firstName + userData.lastName + userData.username)}_${randomUUID()}_thumbnail.${fileExtension}`,
        userData.profile?.avatarFile.type
      );
      userData.profile.avatar = avatarUrl;
    }
    delete userData.profile?.avatarFile;
    userData.profile = {
      ...userData.profile,
      address: { ...userData.profile?.address, country: userData.country },
    };
    userData.preferredCurrency = getPreferredCurrency(userData.country);
    return await createAuthorizedNatsRequest<{ message: string }, CreateUserDto>(
      'users.organizationCreateUser',
      userData as CreateUserDto
    );
  } catch (error) {
    if (avatarUrl) await deleteFromS3(avatarUrl);
    throw error;
  }
}

export async function updateSelfUserAction(userData: Partial<EditUserFormData>) {
  let avatarUrl;
  try {
    const payload: Partial<EditUserFormData> = { ...userData };
    // roleName is kept in the self form only to decide whether to show instructor
    // fields — never let a self-update change the account's role. Populated display
    // arrays (categories/grades/schoolTypes) are not part of the update contract.
    const cleanup = payload as Record<string, unknown>;
    delete cleanup.roleName;
    delete cleanup.categories;
    delete cleanup.grades;
    delete cleanup.schoolTypes;
    if (payload.profile?.avatarFile instanceof File) {
      const fileExtension = payload.profile.avatarFile.name.split('.').pop() ?? 'jpg';
      const name =
        [payload.firstName, payload.lastName, payload.username].filter(Boolean).join('_') ||
        'avatar';
      avatarUrl = await uploadFile(
        await payload.profile.avatarFile.arrayBuffer(),
        `users/avatars/${slugify(name)}_${randomUUID()}_thumbnail.${fileExtension}`,
        payload.profile.avatarFile.type
      );
      payload.profile = { ...payload.profile, avatar: avatarUrl };
      delete payload.profile.avatarFile;
    }
    if (payload.profile?.address && payload.country) {
      payload.profile = {
        ...payload.profile,
        address: { ...payload.profile.address, country: payload.country },
      };
    }
    const result = await createAuthorizedNatsRequest<
      { message: string },
      Partial<EditUserFormData>
    >('user.updateOwnData', payload);
    // Drop the cached auth user so the next read sees the updated profile (e.g. new currency).
    const idToken = await getCookie(AUTH_COOKIE_NAME);
    if (idToken) await redis.del(`auth-${idToken}`);
    return result;
  } catch (error) {
    if (avatarUrl) await deleteFromS3(avatarUrl);
    throw error;
  }
}

export async function updateOneUserAction(userId: string, userData: Partial<EditUserFormData>) {
  let avatarUrl;
  try {
    const payload: Partial<EditUserFormData> = { ...userData };
    if (payload.profile?.avatarFile instanceof File) {
      const fileExtension = payload.profile.avatarFile.name.split('.').pop() ?? 'jpg';
      const name =
        [payload.firstName, payload.lastName, payload.username].filter(Boolean).join('_') ||
        'avatar';
      avatarUrl = await uploadFile(
        await payload.profile.avatarFile.arrayBuffer(),
        `users/avatars/${slugify(name)}_${randomUUID()}_thumbnail.${fileExtension}`,
        payload.profile.avatarFile.type
      );
      payload.profile = { ...payload.profile, avatar: avatarUrl };
      delete payload.profile.avatarFile;
    }
    if (payload.profile?.address && payload.country) {
      payload.profile = {
        ...payload.profile,
        address: { ...payload.profile.address, country: payload.country },
      };
    }
    return await createAuthorizedNatsRequest<
      { message: string },
      { userId: string; userData: Partial<EditUserFormData> }
    >('users.organizationUpdateUser', {
      userId,
      userData: payload,
    });
  } catch (error) {
    if (avatarUrl) await deleteFromS3(avatarUrl);
    throw error;
  }
}
