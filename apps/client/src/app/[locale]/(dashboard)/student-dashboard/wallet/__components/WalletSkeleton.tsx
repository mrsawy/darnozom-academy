import { Card, CardContent, CardHeader } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';

export function WalletBalanceSkeleton() {
  return (
    <Card className="from-primary to-primary/80 border-0 bg-gradient-to-l dark:bg-gradient-to-br">
      <CardContent className="pt-6">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="bg-primary-foreground/20 mb-2 h-4 w-32" />
            <Skeleton className="bg-primary-foreground/20 mb-2 h-12 w-40" />
            <Skeleton className="bg-primary-foreground/20 h-4 w-16" />
          </div>
          <Skeleton className="bg-primary-foreground/20 h-12 w-12 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="bg-primary-foreground/20 h-10 flex-1" />
          <Skeleton className="bg-primary-foreground/20 h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TransactionListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex flex-1 items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-4 w-36" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="mb-2 h-6 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
