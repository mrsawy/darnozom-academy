'use client';

import { useQuery } from '@/lib/utils';
import { getAgeRanges, getPublicAgeRanges, type AgeRangeResponse } from '@/lib/actions/age-range/age-range.action';

export const ageRangeKeys = {
  all: ['age-ranges'] as const,
  list: () => ['age-ranges', 'list'] as const,
  publicList: () => ['age-ranges', 'public-list'] as const,
};

/** Reads the platform age range list for populating course forms and filters. */
export function useAgeRanges() {
  return useQuery<AgeRangeResponse[]>({
    queryKey: ageRangeKeys.list(),
    queryFn: getAgeRanges,
    staleTime: 5 * 60 * 1000,
  });
}

/** Public (unauthenticated) age range list for the catalog / home page filters. */
export function usePublicAgeRanges() {
  return useQuery<AgeRangeResponse[]>({
    queryKey: ageRangeKeys.publicList(),
    queryFn: getPublicAgeRanges,
    staleTime: 5 * 60 * 1000,
  });
}
