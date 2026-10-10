'use client';

import { getCourseReviews } from '@/lib/actions/review/getCourseReviews.action';
import { useInfiniteQuery } from '@/lib/utils/query/useInfiniteQuery';

const DEFAULT_LIMIT = 10;

export function useCourseReviews(
  courseId: string | undefined,
  options?: { enabled?: boolean; limit?: number }
) {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const enabled = Boolean(courseId) && (options?.enabled ?? true);

  return useInfiniteQuery({
    queryKey: ['course-reviews', courseId, limit] as const,
    queryFn: async ({ pageParam }) => {
      if (!courseId) throw new Error('courseId is required');
      return getCourseReviews(courseId, pageParam, limit);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextPage ?? lastPage.page + 1) : undefined,
    enabled,
  });
}
