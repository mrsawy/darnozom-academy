'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  type PlanResponse,
  type CreatePlanPayload,
  type UpdatePlanPayload,
} from '@/lib/actions/plan/plan.action';

// ─── Query Keys ─────────────────────────────────────────────────────

export const adminPlanKeys = {
  all: ['admin-plans'] as const,
  list: () => ['admin-plans', 'list'] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'An unexpected error occurred';
}

// ─── Queries ────────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery<PlanResponse[]>({
    queryKey: adminPlanKeys.list(),
    queryFn: getPlans,
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminPlans.toasts');
  return useMutation({
    mutationFn: (data: CreatePlanPayload) => createPlan(data),
    onSuccess: () => {
      toast.success(t('created'));
      void queryClient.invalidateQueries({ queryKey: adminPlanKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminPlans.toasts');
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanPayload }) => updatePlan(id, data),
    onSuccess: () => {
      toast.success(t('updated'));
      void queryClient.invalidateQueries({ queryKey: adminPlanKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminPlans.toasts');
  return useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      toast.success(t('deleted'));
      void queryClient.invalidateQueries({ queryKey: adminPlanKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
