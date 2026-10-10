'use client';

import { getPublicPlans, type PlanResponse } from '@/lib/actions/plan/plan.action';
import { useQuery } from '@/lib/utils';

interface UsePricingPlansOptions {
  enabled?: boolean;
  cached?: boolean;
}

export function usePricingPlans({ enabled = true, cached = false }: UsePricingPlansOptions = {}) {
  return useQuery<PlanResponse[]>({
    queryKey: ['plans', 'public'],
    queryFn: getPublicPlans,
    enabled,
    cached,
  });
}
