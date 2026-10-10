'use client';

import { getStudentQuizSubmissionsAction } from '@/lib/actions/courses/content/content.action';
import type { GetStudentQuizSubmissionsResponse } from '@/lib/types/course/DTO/quizSubmission.dto';
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@/lib/utils';
import { quizKeys } from './quizKeys';

type Options = Omit<
  UseQueryOptions<GetStudentQuizSubmissionsResponse, Error>,
  'queryKey' | 'queryFn'
>;

/**
 * Loads the signed-in student's quiz attempts for a quiz content item (`course.getStudentQuizSubmissions`).
 */
export function useStudentQuizSubmissions(
  quizContentId: string,
  options?: Options
): UseQueryResult<GetStudentQuizSubmissionsResponse, Error> {
  const { enabled: enabledOption, staleTime, ...rest } = options ?? {};

  return useQuery<GetStudentQuizSubmissionsResponse, Error>({
    queryKey: quizKeys.studentSubmissions(quizContentId),
    queryFn: () => getStudentQuizSubmissionsAction(quizContentId),
    enabled: Boolean(quizContentId) && (enabledOption ?? true),
    staleTime: staleTime ?? 60 * 1000,
    ...rest,
  });
}
