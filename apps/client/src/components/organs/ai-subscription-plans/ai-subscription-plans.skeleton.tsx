import { Skeleton } from '@/components/atoms/skeleton';

export function AiSubscriptionPlansSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-2xl border-2 p-6">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
