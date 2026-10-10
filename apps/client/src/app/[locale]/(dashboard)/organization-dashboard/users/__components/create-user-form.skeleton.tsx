import { Skeleton } from '@/components/atoms/skeleton';

export default function CreateUserFormSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header bar */}
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Page title */}
            <div className="mb-6">
              <div className="mb-2 flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Tabs */}
            <div className="w-full">
              <div className="mb-4 flex w-full flex-col justify-center gap-1 sm:flex-row">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 flex-1" />
                ))}
              </div>

              {/* Basic tab card */}
              <div className="rounded-lg border p-6">
                {/* Card header */}
                <Skeleton className="mb-1 h-6 w-40" />
                <Skeleton className="mb-6 h-4 w-56" />

                {/* 2-col field grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>

                {/* Status + Country row */}
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status card */}
            <div className="rounded-lg border p-6">
              <Skeleton className="mb-4 h-5 w-24" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>

            {/* Tips card */}
            <div className="rounded-lg border p-6">
              <Skeleton className="mb-4 h-5 w-16" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
