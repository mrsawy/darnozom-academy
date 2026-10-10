'use client';

import { Skeleton } from '@/components/atoms/skeleton';
import { useStudentEnrollments } from '@/lib/hooks/enrollment/enrollments.hook';
import type { PaginationOptions } from '@/lib/types/Paginated';
import Enrollments from './courses-view';

interface StudentCoursesWithDataProps {
  paginationOptions: PaginationOptions;
}

export function StudentCoursesWithData({ paginationOptions }: StudentCoursesWithDataProps) {
  const { data, isPending, isError, error } = useStudentEnrollments(paginationOptions);

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-4 h-9 w-64" />
        <Skeleton className="mb-8 h-5 w-full max-w-xl" />
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive" role="alert">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Enrollments enrollments={data?.docs ?? []} />
    </div>
  );
}
