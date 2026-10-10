'use client';

import { getFeaturedCourses } from '@/lib/actions/courses/getFeaturedCourses.action';
import { ICourse } from '@/lib/types/course/course.interface';
import { useQuery } from '@/lib/utils';

interface UseFeaturedCoursesOptions {
  limit?: number;
  enabled?: boolean;
}

export function useFeaturedCourses({ limit = 9, enabled = true }: UseFeaturedCoursesOptions = {}) {
  return useQuery<ICourse[]>({
    queryKey: ['courses', 'featured', limit],
    queryFn: () => getFeaturedCourses({ limit }),
    enabled,
    cached: true,
    cacheTtl: '5h',
  });
}
