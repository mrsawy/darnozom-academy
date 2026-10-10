'use client';

import { getFeaturedInstructors } from '@/lib/actions/instructors/getFeaturedInstructors.action';
import { IInstructor } from '@/lib/types/user/user.interface';
import { useQuery } from '@/lib/utils';

interface UseFeaturedInstructorsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useFeaturedInstructors({
  limit = 9,
  enabled = true,
}: UseFeaturedInstructorsOptions = {}) {
  return useQuery<IInstructor[]>({
    queryKey: ['instructors', 'featured', limit],
    queryFn: () => getFeaturedInstructors({ limit }),
    enabled,
    cached: true,
    cacheTtl: '5h',
  });
}
