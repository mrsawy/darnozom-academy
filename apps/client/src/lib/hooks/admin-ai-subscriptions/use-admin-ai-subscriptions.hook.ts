'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
  getAiSubscriptions,
  cancelAiSubscription,
  type AiSubscriptionFilters,
  type PaginatedAiSubscriptions,
} from '@/lib/actions/ai-subscription/ai-subscription.action';

export const adminAiSubscriptionKeys = {
  all: ['admin-ai-subscriptions'] as const,
  list: (filters?: AiSubscriptionFilters, page?: number, limit?: number) =>
    ['admin-ai-subscriptions', 'list', filters, page, limit] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'An unexpected error occurred';
}

export function useAdminAiSubscriptions(filters?: AiSubscriptionFilters, page = 1, limit = 20) {
  return useQuery<PaginatedAiSubscriptions>({
    queryKey: adminAiSubscriptionKeys.list(filters, page, limit),
    queryFn: () => getAiSubscriptions({ page, limit }, filters),
    staleTime: 30 * 1000,
  });
}

export function useCancelAiSubscription() {
  const queryClient = useQueryClient();
  const t = useTranslations('AdminAiSubscriptions.toasts');
  return useMutation({
    mutationFn: (id: string) => cancelAiSubscription(id),
    onSuccess: () => {
      toast.success(t('cancelled'));
      void queryClient.invalidateQueries({ queryKey: adminAiSubscriptionKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
