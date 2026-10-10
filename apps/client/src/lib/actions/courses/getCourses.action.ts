'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { ICourse, PublishStatus } from '@/lib/types/course/course.interface';
import { Paginated, PaginationOptions, withDefaults } from '@/lib/types/Paginated';
import { ICourseFilters } from '@/lib/types/course/ICourseFilters';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

function sanitizeCourseFilters<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '$undefined' && v !== ''
    )
  ) as Partial<T>;
}

export async function findCourses(rawFilters: ICourseFilters) {
  const filters = sanitizeCourseFilters(rawFilters) as ICourseFilters;
  try {
    const natsClient = await connectToNats();
    const response = await request<Paginated<ICourse>>(
      natsClient,
      'courses.findAllCourses',
      JSON.stringify({
        id: randomUUID(),
        data: {
          options: filters,
        },
      })
    );
    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as Paginated<ICourse>;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to find courses');
  }
}

export async function getCourses(options?: PaginationOptions) {
  try {
    const natsClient = await connectToNats();

    const idToken = await getCookie(AUTH_COOKIE_NAME);
    const opts = withDefaults(options ?? {});

    const response = await request<Paginated<ICourse>>(
      natsClient,
      'courses.getAllCourses',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          options: {
            page: opts.page,
            limit: opts.limit,
            ...(opts.search ? { search: opts.search } : {}),
          },
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as Paginated<ICourse>;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to get courses');
  }
}

export async function getCoursesByInstructor(
  instructorId: string,
  options?: { page?: number; limit?: number }
) {
  try {
    const natsClient = await connectToNats();
    const response = await request<Paginated<ICourse>>(
      natsClient,
      'courses.findAllCourses',
      JSON.stringify({
        id: randomUUID(),
        data: {
          options: {
            $or: [{ instructorId }, { coInstructorsIds: instructorId }],
            page: options?.page ?? 1,
            limit: options?.limit ?? 20,
            ...options,
          },
        },
      })
    );
    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as Paginated<ICourse>;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to get courses by instructor');
  }
}

export async function deleteCourse(courseId: string) {
  const response = await createAuthorizedNatsRequest<{ success: boolean; message: string }>(
    'course.deleteCourse',
    {
      courseId,
    }
  );
  const headersList = await headers();
  const referer = headersList.get('referer');
  if (referer) {
    const url = new URL(referer);
    revalidatePath(url.pathname);
  }
  return response;
}

export async function setCoursePublishStatus(courseId: string, publishStatus: PublishStatus) {
  const response = await createAuthorizedNatsRequest<{ success: boolean; data: ICourse }>(
    'course.setPublishStatus',
    {
      courseId,
      publishStatus,
    }
  );
  const headersList = await headers();
  const referer = headersList.get('referer');
  if (referer) {
    const url = new URL(referer);
    revalidatePath(url.pathname);
  }
  return response;
}
