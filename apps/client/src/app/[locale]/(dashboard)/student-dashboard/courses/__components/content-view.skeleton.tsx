'use client';

import { Skeleton } from '@/components/atoms/skeleton';

export function ContentViewSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="w-full">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex flex-col">
            <Skeleton className="mb-6 h-9 w-40 self-end" />

            <div className="rounded-lg border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="flex w-full justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <Skeleton className="h-9 w-3/4 max-w-md" />
                    <Skeleton className="h-5 w-full max-w-xl" />
                    <Skeleton className="h-5 w-full max-w-lg" />
                    <div className="flex items-center gap-3 pt-1">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-8 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-[92%]" />
              <Skeleton className="h-64 w-full rounded-md" />
              <Skeleton className="h-6 w-[88%]" />
              <Skeleton className="h-6 w-[95%]" />
            </div>
          </div>

          <div className="mt-8 rounded-lg border p-6 shadow-sm">
            <Skeleton className="mb-4 h-7 w-48" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
