'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
  getAiPlans,
  createAiPlan,
  updateAiPlan,
  deleteAiPlan,
  type AiPlanResponse,
  type CreateAiPlanPayload,
  type UpdateAiPlanPayload,
} from '@/lib/actions/ai-plan/ai-plan.action';

export const adminAiPlanKeys = {
  all: ['admin-ai-plans'] as const,
  list: () => ['admin-ai-plans', 'list'] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'An unexpected error occurred';
}

export function useAdminAiPlans() {
  return useQuery<AiPlanResponse[]>({
    queryKey: adminAiPlanKeys.list(),
    queryFn: getAiPlans,
    staleTime: 60 * 1000,
  });
}

export function useCreateAiPlan() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminAiPlans.toasts');
  return useMutation({
    mutationFn: (data: CreateAiPlanPayload) => createAiPlan(data),
    onSuccess: () => {
      toast.success(t('created'));
      void queryClient.invalidateQueries({ queryKey: adminAiPlanKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateAiPlan() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminAiPlans.toasts');
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAiPlanPayload }) => updateAiPlan(id, data),
    onSuccess: () => {
      toast.success(t('updated'));
      void queryClient.invalidateQueries({ queryKey: adminAiPlanKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteAiPlan() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminAiPlans.toasts');
  return useMutation({
    mutationFn: (id: string) => deleteAiPlan(id),
    onSuccess: () => {
      toast.success(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: adminAiPlanKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
