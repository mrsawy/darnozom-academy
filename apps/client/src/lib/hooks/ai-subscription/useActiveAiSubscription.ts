'use client';

import { useQuery } from '@/lib/utils';
import {
  getActiveAiSubscription,
  type AiSubscriptionResponse,
} from '@/lib/actions/ai-subscription/ai-subscription.action';

export const aiSubscriptionKeys = {
  all: ['ai-subscription'] as const,
  active: () => ['ai-subscription', 'active'] as const,
};

/** Returns the current user's active AI subscription, or null/undefined when none. */
export function useActiveAiSubscription() {
  return useQuery<AiSubscriptionResponse | null>({
    queryKey: aiSubscriptionKeys.active(),
    queryFn: getActiveAiSubscription,
    staleTime: 60 * 1000,
  });
}
