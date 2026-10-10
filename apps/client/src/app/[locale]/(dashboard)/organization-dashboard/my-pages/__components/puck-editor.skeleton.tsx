import { Skeleton } from '@/components/atoms/skeleton';

/**
 * Mimics Puck's three-pane editor layout (left components list, center canvas,
 * right inspector) so the route swap feels instant instead of flashing empty.
 */
export default function PuckEditorSkeleton() {
  return (
    <div className="animate-in fade-in flex h-[calc(100vh-4rem)] w-full">
      <aside className="bg-muted/30 hidden w-64 shrink-0 border-r p-4 lg:block">
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        <div className="bg-background flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="bg-muted/20 flex-1 overflow-hidden p-8">
          <div className="mx-auto max-w-5xl space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </section>

      <aside className="bg-muted/30 hidden w-72 shrink-0 border-l p-4 xl:block">
        <Skeleton className="mb-4 h-6 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
