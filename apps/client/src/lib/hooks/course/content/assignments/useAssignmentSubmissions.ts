'use client';

import { useInfiniteQuery, type InfiniteData } from '@/lib/utils';
import { getAssignmentSubmissionsAction } from '@/lib/actions/courses/content/content.action';
import type { GetAssignmentSubmissionsResponse } from '@/lib/types/course/DTO/assignmentSubmission.dto';
import { assignmentKeys } from './assignmentKeys';

export const ASSIGNMENT_SUBMISSIONS_PAGE_SIZE = 5;

/**
 * Paginated list of all student submissions for an assignment (`allSubmissions` + scroll/load more).
 * Uses `course.getAssignmentSubmissions` with 5 items per page by default.
 */
export function useAssignmentSubmissionsInfinite(
  assignmentId: string,
  options?: { pageSize?: number; enabled?: boolean }
) {
  const pageSize = options?.pageSize ?? ASSIGNMENT_SUBMISSIONS_PAGE_SIZE;
  const enabled = options?.enabled ?? true;

  return useInfiniteQuery<
    GetAssignmentSubmissionsResponse,
    Error,
    InfiniteData<GetAssignmentSubmissionsResponse>
  >({
    queryKey: assignmentKeys.submissionsInfinite(assignmentId, pageSize),
    queryFn: async ({ pageParam }) =>
      getAssignmentSubmissionsAction({
        assignmentId,
        allSubmissions: true,
        page: pageParam as number,
        limit: pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return;
      return (lastPage.page ?? 1) + 1;
    },
    enabled: Boolean(assignmentId) && enabled,
    staleTime: 60 * 1000,
  });
}
