'use client';

import { Skeleton } from '@/components/atoms/skeleton';

export function EnrollmentSubscriptionDialogSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
