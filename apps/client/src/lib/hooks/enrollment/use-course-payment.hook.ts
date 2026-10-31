'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as api from '@/lib/actions/enrollment/coursePayment.action';
import { enrollmentKeys } from '@/lib/hooks/enrollment/enrollments.hook';
import type {
  CoursePaymentStatus,
  ICoursePayment,
  ICoursePaymentOptions,
  SubmitCoursePaymentInput,
} from '@/lib/types/enrollment/course-payment';

const ROOT = 'course-payments';

export const coursePaymentKeys = {
  options: (courseId: string) => [ROOT, 'options', courseId] as const,
  mine: [ROOT, 'mine'] as const,
  org: (filter?: { status?: CoursePaymentStatus }) => [ROOT, 'org', filter ?? {}] as const,
};

export const useCoursePaymentOptions = (courseId: string, enabled = true) =>
  useQuery({
    queryKey: coursePaymentKeys.options(courseId),
    queryFn: async (): Promise<ICoursePaymentOptions> => unwrap(await api.getCoursePaymentOptions(courseId)),
    enabled: enabled && Boolean(courseId),
  });

/** The signed-in student's own course payments (used to show the rejection reason). */
export const useMyCoursePayments = (enabled = true) =>
  useQuery({
    queryKey: coursePaymentKeys.mine,
    queryFn: async (): Promise<ICoursePayment[]> => unwrap(await api.getMyCoursePayments()),
    enabled,
  });

export const useOrgCoursePayments = (filter?: { status?: CoursePaymentStatus }) =>
  useQuery({
    queryKey: coursePaymentKeys.org(filter),
    queryFn: async (): Promise<ICoursePayment[]> => unwrap(await api.getOrgCoursePayments(filter)),
  });

export function useSubmitCoursePayment(courseId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('CoursePayments');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: async (input: SubmitCoursePaymentInput) => unwrap(await api.submitCoursePayment(input)),
    onSuccess: () => {
      toast.success(t('submitted'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment-by-course', courseId] });
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.student() });
    },
    onError: (error: Error) => toast.error(translateApiMessage(error.message, tErrors)),
  });
}

function useReviewMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const t = useTranslations('CoursePayments');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t('reviewSaved'));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => toast.error(translateApiMessage(error.message, tErrors)),
  });
}

export const useApproveCoursePayment = () =>
  useReviewMutation(async (paymentId: string) => unwrap(await api.approveCoursePayment(paymentId)));

export const useRejectCoursePayment = () =>
  useReviewMutation(async (vars: { paymentId: string; reason: string }) =>
    unwrap(await api.rejectCoursePayment(vars.paymentId, vars.reason))
  );
