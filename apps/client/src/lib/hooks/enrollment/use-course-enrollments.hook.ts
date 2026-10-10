'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@/lib/utils';
import { getCourseEnrollments } from '@/lib/actions/enrollment/getCourseEnrollments.action';
import { Paginated } from '@/lib/types/Paginated';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import type { Option } from '@/components/molecules/multi-select/multi-select';

export const courseEnrollmentKeys = {
  all: ['course-enrollments'] as const,
  course: (courseId: string) => [...courseEnrollmentKeys.all, courseId] as const,
  infinite: (courseId: string, search: string, pageSize: number) =>
    [...courseEnrollmentKeys.course(courseId), 'infinite', search, pageSize] as const,
};

const DEFAULT_PAGE_SIZE = 10;

function enrollmentToOption(enrollment: IEnrollment): Option | null {
  const user = enrollment.user;
  if (!user) return null;
  const label = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '';
  return {
    value: enrollment.userId,
    label: label ? `${label} (${user.email})` : (user.email ?? enrollment.userId),
  };
}

export interface UseInfiniteCourseEnrollmentsOptions {
  courseId?: string;
  search?: string;
  pageSize?: number;
}

/**
 * Infinite-scroll hook for enrolled students in a specific course.
 * Pulls from `enrollment.getCourseEnrollments` (populated with user data).
 * Only enabled when `courseId` is provided.
 */
export function useInfiniteCourseEnrollments(opts: UseInfiniteCourseEnrollmentsOptions = {}) {
  const { courseId, search = '', pageSize = DEFAULT_PAGE_SIZE } = opts;

  const infiniteQuery = useInfiniteQuery<
    Paginated<IEnrollment>,
    Error,
    InfiniteData<Paginated<IEnrollment>>,
    readonly unknown[],
    number
  >({
    queryKey: courseEnrollmentKeys.infinite(courseId ?? '', search, pageSize),
    queryFn: async ({ pageParam }) => {
      if (!courseId) {
        return {
          docs: [],
          totalDocs: 0,
          limit: pageSize,
          totalPages: 0,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        } satisfies Paginated<IEnrollment>;
      }
      return getCourseEnrollments(courseId, {
        page: pageParam,
        limit: pageSize,
        search: search || undefined,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextPage ?? lastPage.page + 1) : undefined,
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });

  const options: Option[] = useMemo(
    () =>
      infiniteQuery.data?.pages.flatMap((p) =>
        (p.docs ?? []).map(enrollmentToOption).filter((o): o is Option => o !== null)
      ) ?? [],
    [infiniteQuery.data]
  );

  return {
    data: options,
    hasMore: infiniteQuery.hasNextPage ?? false,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    pageSize,
  };
}
