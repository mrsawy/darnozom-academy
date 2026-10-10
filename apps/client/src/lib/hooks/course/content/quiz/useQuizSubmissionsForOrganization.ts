'use client';

import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from '@/lib/utils';
import { getQuizSubmissionsForOrganizationAction } from '@/lib/actions/courses/content/content.action';
import type { GetQuizSubmissionsForOrganizationResponse } from '@/lib/types/course/DTO/quizSubmission.dto';
import { quizKeys } from './quizKeys';

export const QUIZ_ORG_SUBMISSIONS_PAGE_SIZE = 20;

interface Options {
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Paginated quiz attempts across all enrolled students for organization staff (`course.getQuizSubmissionsForOrganization`).
 */
export function useQuizSubmissionsForOrganization(
  quizContentId: string,
  options?: Options
): UseInfiniteQueryResult<InfiniteData<GetQuizSubmissionsForOrganizationResponse>, Error> {
  const pageSize = options?.pageSize ?? QUIZ_ORG_SUBMISSIONS_PAGE_SIZE;
  const enabled = options?.enabled ?? true;

  return useInfiniteQuery<GetQuizSubmissionsForOrganizationResponse, Error>({
    queryKey: quizKeys.orgSubmissionsInfinite(quizContentId, pageSize),
    queryFn: async ({ pageParam }) =>
      getQuizSubmissionsForOrganizationAction(quizContentId, {
        page: pageParam as number,
        limit: pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage;
      if (page * limit >= total) return;
      return page + 1;
    },
    enabled: Boolean(quizContentId) && enabled,
    staleTime: 60 * 1000,
  });
}
