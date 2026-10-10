'use client';

import { Skeleton } from '@/components/atoms/skeleton';

export function CourseContentSidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b border-slate-200 p-6 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {[0, 1, 2].map((moduleIndex) => (
          <div key={moduleIndex} className="border-b border-slate-300 dark:border-slate-800">
            <div className="flex w-full items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-44 max-w-[70%]" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="py-1">
              {(moduleIndex === 0 ? [0, 1, 2, 3] : [0, 1, 2]).map((row) => (
                <div key={row} className="flex w-full items-center gap-3 px-6 py-3">
                  <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                  <div className="min-w-0 flex-1 space-y-2 text-right">
                    <Skeleton className="ms-auto h-4 w-full max-w-[200px]" />
                    {row % 2 === 0 ? <Skeleton className="ms-auto h-3 w-14" /> : null}
                  </div>
                  <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}
