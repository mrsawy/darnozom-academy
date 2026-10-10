'use client';

import { useQuery, useInfiniteQuery } from '@/lib/utils';
import type { InfiniteData } from '@/lib/utils';
import {
  getCourses,
  getCoursesByInstructor,
  findCourses,
} from '@/lib/actions/courses/getCourses.action';
import { createNatsRequest } from '@/lib/utils/createNatsRequest';
import { ICourse, ICourseOverview } from '@/lib/types/course/course.interface';
import { Paginated, PaginationOptions } from '@/lib/types/Paginated';
import { ICourseFilters } from '@/lib/types/course/ICourseFilters';
import type { Option } from '@/components/molecules/multi-select/multi-select';
// import useGeneralStore from '../store/generalStore';

// Query keys
export const courseKeys = {
  all: ['course'] as const,
  organization: () => [...courseKeys.all, 'organization'] as const,
  byInstructor: (instructorId: string) => [...courseKeys.all, 'instructor', instructorId] as const,
  publicOverview: (courseId: string) => [...courseKeys.all, 'public-overview', courseId] as const,
};

/** Public catalog course detail (unauthenticated NATS). */
export function usePublicCourseOverview(courseId: string) {
  return useQuery<ICourseOverview>({
    queryKey: courseKeys.publicOverview(courseId),
    queryFn: () =>
      createNatsRequest<ICourseOverview>('courses.getCourseWithModule', {
        courseId,
        includeContents: true,
        contentSelect: 'title type',
      }),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

// Custom hook for fetching content by module ID
export function useCourses() {
  return useQuery({
    queryKey: courseKeys.organization(),
    queryFn: async () => {
      const response = await getCourses();

      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for fetching courses by instructor with infinite scroll
export function useCoursesByInstructor(instructorId: string, limit = 12) {
  return useInfiniteQuery<Paginated<ICourse>>({
    queryKey: [...courseKeys.byInstructor(instructorId), limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getCoursesByInstructor(instructorId, {
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.nextPage : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCoursesByOrganization(
  options: PaginationOptions,
  queryOptions?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...courseKeys.organization(), options],
    queryFn: async () => {
      const response = await getCourses(options);
      return response;
    },
    enabled: queryOptions?.enabled ?? true,
    staleTime: 3 * 60 * 1000, // 3 minutes
    // Always refetch when returning to the list (e.g. after creating a course).
    refetchOnMount: 'always',
  });
}

function courseToOption(course: ICourse): Option {
  return { value: course._id ?? '', label: course.name ?? '' };
}

export interface UseInfiniteCoursesOrgOptions {
  search?: string;
  pageSize?: number;
}

export function useInfiniteCoursesByOrg(opts: UseInfiniteCoursesOrgOptions = {}) {
  const { search = '', pageSize = 10 } = opts;

  const infiniteQuery = useInfiniteQuery<
    Paginated<ICourse>,
    Error,
    InfiniteData<Paginated<ICourse>>,
    readonly unknown[],
    number
  >({
    queryKey: [...courseKeys.organization(), 'infinite', search, pageSize] as const,
    queryFn: async ({ pageParam }) => {
      return getCourses({
        page: pageParam,
        limit: pageSize,
        search: search || undefined,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextPage ?? undefined) : undefined,
    staleTime: 3 * 60 * 1000,
  });

  const options: Option[] = (infiniteQuery.data?.pages ?? [])
    .flatMap((p) => p.docs ?? [])
    .map(courseToOption)
    .filter((o) => o.value !== '');

  return {
    ...infiniteQuery,
    options,
    hasMore: infiniteQuery.hasNextPage,
    pageSize,
  };
}

// Query key for public filtered courses
const filteredCourseKeys = {
  filtered: (filters: ICourseFilters) => ['public-courses', filters] as const,
};

// Infinite-scroll hook for the public courses listing page
export function useFilteredCourses(filters: ICourseFilters, limit = 12) {
  const { page: _page, limit: _limit, ...filterWithoutPage } = filters;
  return useInfiniteQuery<Paginated<ICourse>, Error, InfiniteData<Paginated<ICourse>>>({
    queryKey: filteredCourseKeys.filtered({ ...filterWithoutPage, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      return await findCourses({
        ...filterWithoutPage,
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit,
      });
    },
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}
