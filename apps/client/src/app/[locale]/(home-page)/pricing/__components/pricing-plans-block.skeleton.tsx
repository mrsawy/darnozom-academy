import { Card, CardContent, CardHeader } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import { cn } from '@/lib/utils';

function PricingPlanCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        'bg-card/85 relative flex h-full flex-col overflow-hidden rounded-2xl border-2 shadow-md backdrop-blur-sm',
        className
      )}>
      <CardHeader className="pt-10 pb-4 text-center">
        <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
        <Skeleton className="mx-auto h-8 w-36" />
        <Skeleton className="mx-auto mt-3 h-4 w-full max-w-[220px]" />
        <div className="mt-6 space-y-2">
          <Skeleton className="mx-auto h-10 w-28" />
          <Skeleton className="mx-auto h-4 w-20" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6 pt-0">
        <Skeleton className="h-11 w-full rounded-md" />
        <ul className="flex flex-1 flex-col gap-3">
          {['a', 'b', 'c', 'd'].map((key) => (
            <li key={key} className="flex items-start gap-3 text-start">
              <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-sm" />
              <Skeleton className="h-4 max-w-[85%] flex-1" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PricingPlansBlockSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="light:glassy dir-ltr dark:bg-muted! mx-auto mb-10 flex max-w-lg flex-wrap items-center justify-center gap-3 rounded-full border px-4 py-3">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-7 w-11 shrink-0 rounded-full" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <PricingPlanCardSkeleton />
        <PricingPlanCardSkeleton className="md:scale-105" />
        <PricingPlanCardSkeleton />
      </div>
    </div>
  );
}
