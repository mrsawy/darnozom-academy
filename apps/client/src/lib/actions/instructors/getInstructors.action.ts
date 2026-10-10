'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { NatsError } from 'nats';
import { IInstructor } from '@/lib/types/user/user.interface';
import { Paginated } from '@/lib/types/Paginated';
import { IInstructorFilters } from '@/lib/types/instructor/IInstructorFilters';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';

function sanitizeFilters<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '$undefined' && v !== ''
    )
  ) as Partial<T>;
}

export async function findInstructors(rawFilters: IInstructorFilters) {
  const filters = sanitizeFilters(rawFilters) as IInstructorFilters;
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    // Flat filter contract — the server builds the Mongo query (search escaping,
    // rating $gte, subject/grade/school-type $in). No Mongo operators are built here.
    const flatFilters: {
      search?: string;
      minRating?: number;
      categoryIds?: string[];
      gradeIds?: string[];
      schoolTypeIds?: string[];
    } = {};

    if (filters.search) {
      flatFilters.search = filters.search;
    }

    if (filters.minRating !== undefined && Number(filters.minRating) > 0) {
      flatFilters.minRating = Number(filters.minRating);
    }

    if (filters.selectedCategory) {
      flatFilters.categoryIds = [filters.selectedCategory];
    }

    if (filters.gradeIds && filters.gradeIds.length > 0) {
      flatFilters.gradeIds = filters.gradeIds;
    }

    if (filters.schoolTypeIds && filters.schoolTypeIds.length > 0) {
      flatFilters.schoolTypeIds = filters.schoolTypeIds;
    }

    const response = await request<Paginated<IInstructor>>(
      natsClient,
      'instructors.findAll',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          options: {
            limit: filters.limit ?? 12,
            page: filters.page ?? 1,
          },
          filters: Object.keys(flatFilters).length > 0 ? flatFilters : undefined,
        },
      })
    );

    if ('err' in response) {
      return {
        err: { message: (response as { err: NatsError }).err.message },
      } as unknown as Paginated<IInstructor>;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to fetch instructors');
  }
}

export async function getInstructor(instructorId: string) {
  try {
    const natsClient = await connectToNats();
    const response = await request<IInstructor>(
      natsClient,
      'instructors.findOne',
      JSON.stringify({
        id: randomUUID(),
        data: {
          instructorId: instructorId,
        },
      })
    );

    if ('err' in response) {
      return {
        err: { message: (response as { err: NatsError }).err.message },
      } as unknown as IInstructor;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to fetch instructor');
  }
}
