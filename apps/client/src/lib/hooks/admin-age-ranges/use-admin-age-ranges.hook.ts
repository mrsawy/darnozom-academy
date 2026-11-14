'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  getAgeRanges,
  createAgeRange,
  updateAgeRange,
  deleteAgeRange,
  type AgeRangeResponse,
  type CreateAgeRangePayload,
  type UpdateAgeRangePayload,
} from '@/lib/actions/age-range/age-range.action';

export const adminAgeRangeKeys = {
  all: ['admin-age-ranges'] as const,
  list: () => ['admin-age-ranges', 'list'] as const,
};

const ERRORS_NS = 'errors';

export function useAdminAgeRanges() {
  return useQuery<AgeRangeResponse[]>({
    queryKey: adminAgeRangeKeys.list(),
    queryFn: getAgeRanges,
    staleTime: 60 * 1000,
  });
}

function useAgeRangeMutationHandlers(toastKey: 'created' | 'updated' | 'deleted') {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminAgeRanges.toasts');
  const tErrors = useTranslations(ERRORS_NS);
  return {
    onSuccess: () => {
      toast.success(t(toastKey));
      void queryClient.invalidateQueries({ queryKey: adminAgeRangeKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['age-ranges'] });
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  };
}

export function useCreateAgeRange() {
  return useMutation({
    mutationFn: (data: CreateAgeRangePayload) => createAgeRange(data),
    ...useAgeRangeMutationHandlers('created'),
  });
}

export function useUpdateAgeRange() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgeRangePayload }) => updateAgeRange(id, data),
    ...useAgeRangeMutationHandlers('updated'),
  });
}

export function useDeleteAgeRange() {
  return useMutation({
    mutationFn: (id: string) => deleteAgeRange(id),
    ...useAgeRangeMutationHandlers('deleted'),
  });
}
