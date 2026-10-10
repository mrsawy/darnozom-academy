import { Card, CardContent, CardHeader } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';

function TabListSkeleton() {
  return (
    <div className="bg-muted grid h-10 w-full grid-cols-4 gap-1 rounded-md p-1">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-full rounded-sm" />
      ))}
    </div>
  );
}

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="mt-2 h-9 w-28" />
      </CardContent>
    </Card>
  );
}

export function AccountPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      <TabListSkeleton />
      <CardSkeleton rows={4} />
    </div>
  );
}
