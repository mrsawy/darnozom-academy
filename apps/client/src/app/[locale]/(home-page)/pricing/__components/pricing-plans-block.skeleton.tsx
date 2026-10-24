import { Skeleton } from '@/components/atoms/skeleton';
import { cn } from '@/lib/utils';

const FEATURE_ROWS = ['a', 'b', 'c', 'd'];

function PricingPlanCardSkeleton() {
  return (
    <div className="bg-dz-paper-raised border-dz-line flex h-full flex-col gap-3.5 rounded-[22px] border p-6.5">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-4 w-full max-w-[200px]" />
      <Skeleton className="h-10 w-32" />
      <div className="border-dz-line flex flex-1 flex-col gap-2 border-t pt-3.5">
        {FEATURE_ROWS.map((key) => (
          <div key={key} className="flex items-start gap-2">
            <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
            <Skeleton className="h-4 max-w-[85%] flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

export function PricingPlansBlockSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-full flex-col items-center gap-9', className)}>
      <Skeleton className="h-11 w-64 rounded-full" />
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
        <PricingPlanCardSkeleton />
        <PricingPlanCardSkeleton />
        <PricingPlanCardSkeleton />
      </div>
    </div>
  );
}
