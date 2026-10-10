'use client';

import { useQuery } from '@/lib/utils';
import { getGrades, getPublicGrades, type GradeResponse } from '@/lib/actions/grade/grade.action';

export const gradeKeys = {
  all: ['grades'] as const,
  list: () => ['grades', 'list'] as const,
  publicList: () => ['grades', 'public-list'] as const,
};

/** Reads the platform grade list for populating course forms and filters. */
export function useGrades() {
  return useQuery<GradeResponse[]>({
    queryKey: gradeKeys.list(),
    queryFn: getGrades,
    staleTime: 5 * 60 * 1000,
  });
}

/** Public (unauthenticated) grade list for the catalog / home page filters. */
export function usePublicGrades() {
  return useQuery<GradeResponse[]>({
    queryKey: gradeKeys.publicList(),
    queryFn: getPublicGrades,
    staleTime: 5 * 60 * 1000,
  });
}
