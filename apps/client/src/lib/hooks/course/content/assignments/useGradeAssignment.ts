'use client';

import { useMutation } from '@/lib/utils';
import { gradeAssignmentAction } from '@/lib/actions/courses/content/content.action';
import type {
  GradeAssignmentPayload,
  GradeAssignmentResponse,
} from '@/lib/types/course/DTO/assignmentSubmission.dto';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { EnrollmentSuccessMessages } from '@lms-organization/shared-types';

export function useGradeAssignment() {
  const tErrors = useTranslations('errors');

  return useMutation<GradeAssignmentResponse, Error, GradeAssignmentPayload>({
    mutationFn: (payload) => gradeAssignmentAction(payload),
    onSuccess: (data) => {
      const msg = data.message ?? EnrollmentSuccessMessages.ASSIGNMENT_GRADED;
      toast.success(translateApiMessage(msg, tErrors));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}
