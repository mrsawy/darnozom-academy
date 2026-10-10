'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  getSchoolTypes,
  createSchoolType,
  updateSchoolType,
  deleteSchoolType,
  type SchoolTypeResponse,
  type CreateSchoolTypePayload,
  type UpdateSchoolTypePayload,
} from '@/lib/actions/school-type/school-type.action';

export const adminSchoolTypeKeys = {
  all: ['admin-school-types'] as const,
  list: () => ['admin-school-types', 'list'] as const,
};

const ERRORS_NS = 'errors';

export function useAdminSchoolTypes() {
  return useQuery<SchoolTypeResponse[]>({
    queryKey: adminSchoolTypeKeys.list(),
    queryFn: getSchoolTypes,
    staleTime: 60 * 1000,
  });
}

export function useCreateSchoolType() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminSchoolTypes.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: (data: CreateSchoolTypePayload) => createSchoolType(data),
    onSuccess: () => {
      toast.success(t('created'));
      void queryClient.invalidateQueries({ queryKey: adminSchoolTypeKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useUpdateSchoolType() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminSchoolTypes.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSchoolTypePayload }) =>
      updateSchoolType(id, data),
    onSuccess: () => {
      toast.success(t('updated'));
      void queryClient.invalidateQueries({ queryKey: adminSchoolTypeKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}

export function useDeleteSchoolType() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminSchoolTypes.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return useMutation({
    mutationFn: (id: string) => deleteSchoolType(id),
    onSuccess: () => {
      toast.success(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: adminSchoolTypeKeys.all });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });
}
