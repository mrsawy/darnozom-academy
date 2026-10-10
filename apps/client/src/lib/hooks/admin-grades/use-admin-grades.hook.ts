'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  type GradeResponse,
  type CreateGradePayload,
  type UpdateGradePayload,
} from '@/lib/actions/grade/grade.action';

export const adminGradeKeys = {
  all: ['admin-grades'] as const,
  list: () => ['admin-grades', 'list'] as const,
};

const ERRORS_NS = 'errors';

export function useAdminGrades() {
  return useQuery<GradeResponse[]>({
    queryKey: adminGradeKeys.list(),
    queryFn: getGrades,
    staleTime: 60 * 1000,
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminGrades.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: (data: CreateGradePayload) => createGrade(data),
    onSuccess: () => {
      toast.success(t('created'));
      void queryClient.invalidateQueries({ queryKey: adminGradeKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminGrades.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGradePayload }) => updateGrade(id, data),
    onSuccess: () => {
      toast.success(t('updated'));
      void queryClient.invalidateQueries({ queryKey: adminGradeKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useDeleteGrade() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminGrades.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: (id: string) => deleteGrade(id),
    onSuccess: () => {
      toast.success(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: adminGradeKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}
