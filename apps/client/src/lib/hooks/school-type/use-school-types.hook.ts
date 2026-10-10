'use client';

import { useQuery } from '@/lib/utils';
import {
  getSchoolTypes,
  getPublicSchoolTypes,
  type SchoolTypeResponse,
} from '@/lib/actions/school-type/school-type.action';

export const schoolTypeKeys = {
  all: ['school-types'] as const,
  list: () => ['school-types', 'list'] as const,
  publicList: () => ['school-types', 'public-list'] as const,
};

/** Reads the platform school-type list for populating course forms and filters. */
export function useSchoolTypes() {
  return useQuery<SchoolTypeResponse[]>({
    queryKey: schoolTypeKeys.list(),
    queryFn: getSchoolTypes,
    staleTime: 5 * 60 * 1000,
  });
}

/** Public (unauthenticated) school-type list for the catalog / home page filters. */
export function usePublicSchoolTypes() {
  return useQuery<SchoolTypeResponse[]>({
    queryKey: schoolTypeKeys.publicList(),
    queryFn: getPublicSchoolTypes,
    staleTime: 5 * 60 * 1000,
  });
}
