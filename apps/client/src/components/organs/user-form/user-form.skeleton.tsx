import { Card, CardContent, CardHeader } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import type { UserFormMode } from './user-form';

export function UserFormSkeleton({ mode = 'self' }: { mode?: UserFormMode }) {
  if (mode !== 'self') {
    return (
      <div className="min-h-screen">
        {/* Admin header bar */}
        <div className="border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main form area */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-48" />
              </div>
              <div className="bg-muted grid h-10 w-full grid-cols-4 gap-1 rounded-md p-1">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-full rounded-sm" />
                ))}
              </div>
              <Card>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-52" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Self mode skeleton
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      <div className="bg-muted grid h-10 w-full grid-cols-4 gap-1 rounded-md p-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-full rounded-sm" />
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Skeleton className="h-10 w-full" />
    </div>
  );
}
