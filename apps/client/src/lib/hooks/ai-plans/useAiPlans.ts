'use client';

import { useQuery } from '@/lib/utils';
import {
  getAiPlans,
  getPublicAiPlans,
  type AiPlanResponse,
} from '@/lib/actions/ai-plan/ai-plan.action';

export const aiPlanKeys = {
  all: ['ai-plans'] as const,
  list: () => ['ai-plans', 'list'] as const,
  public: () => ['ai-plans', 'public'] as const,
};

/** Authenticated query — for dashboard plan pages. */
export function useAiPlans() {
  return useQuery<AiPlanResponse[]>({
    queryKey: aiPlanKeys.list(),
    queryFn: getAiPlans,
    staleTime: 5 * 60 * 1000,
  });
}

/** Public query — for the /ai-pricing marketing page (no auth required). */
export function usePublicAiPlans() {
  return useQuery<AiPlanResponse[]>({
    queryKey: aiPlanKeys.public(),
    queryFn: getPublicAiPlans,
    staleTime: 5 * 60 * 1000,
  });
}
