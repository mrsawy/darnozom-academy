'use client';

import { submitQuizAction } from '@/lib/actions/courses/content/content.action';
import { contentKeys } from '@/lib/hooks/course/content/useContent';
import { quizKeys } from '@/lib/hooks/course/content/quiz';
import type { SubmitQuizDto } from '@/lib/types/course/DTO/quizSubmission.dto';
import useGeneralStore from '@/lib/store/generalStore';
import { useMutation, useQueryClient } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { detailedEnrolledCourseKeys } from '../../useDetailedEnrolledCourse';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';

export function useSubmitQuizMutation(enrollmentId: string, quizId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('StudentCourses.quizContent');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (payload: Omit<SubmitQuizDto, 'enrollmentId' | 'quizId'>) => {
      return await submitQuizAction({
        ...payload,
        enrollmentId,
        quizId,
      });
    },
    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
    onSuccess: () => {
      toast.success(t('quizSubmitted'));
      void queryClient.invalidateQueries({
        queryKey: contentKeys.singleContentInEnrollment(enrollmentId, quizId),
      });
      void queryClient.invalidateQueries({ queryKey: quizKeys.studentSubmissions(quizId) });
      void queryClient.invalidateQueries({
        queryKey: detailedEnrolledCourseKeys.detail(enrollmentId),
      });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : t('failedToSubmit'));
    },
  });
}
