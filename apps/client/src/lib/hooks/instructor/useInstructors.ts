'use client';

import { useInfiniteQuery, type InfiniteData } from '@/lib/utils';
import { findInstructors } from '@/lib/actions/instructors/getInstructors.action';
import { IInstructor } from '@/lib/types/user/user.interface';
import { Paginated } from '@/lib/types/Paginated';
import { IInstructorFilters } from '@/lib/types/instructor/IInstructorFilters';

// Query keys
export const instructorKeys = {
  all: ['instructors'] as const,
  list: (filters: IInstructorFilters) => [...instructorKeys.all, 'list', filters] as const,
};

// Custom hook for fetching instructors with infinite scroll
export function useInstructors(filters: IInstructorFilters, limit = 12) {
  return useInfiniteQuery<Paginated<IInstructor>, Error, InfiniteData<Paginated<IInstructor>>>({
    queryKey: instructorKeys.list({ ...filters, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await findInstructors({
        ...filters,
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.nextPage;
      }
      return;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
