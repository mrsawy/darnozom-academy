import { Skeleton } from '@/components/atoms/skeleton';

export function TeachersSectionSkeleton() {
  return (
    <section className="bg-section-bg py-24">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <Skeleton className="mx-auto mb-6 h-12 w-80" />
          <Skeleton className="mx-auto h-6 w-96" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
