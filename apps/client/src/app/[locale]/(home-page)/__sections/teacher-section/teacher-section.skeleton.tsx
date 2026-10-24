import SectionShell from '@/components/molecules/public-site/section-shell';
import { ANCHOR_HOME_INSTRUCTORS } from '@/lib/data/constants/routes.constants';

const SKELETON_CARDS = [0, 1, 2, 3];

export function TeachersSectionSkeleton() {
  return (
    <SectionShell
      id={ANCHOR_HOME_INSTRUCTORS.slice(1)}
      tone="cocoa"
      innerClassName="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="bg-dz-cocoa-line h-11 w-80 max-w-full animate-pulse rounded-lg" />
        <div className="bg-dz-cocoa-line h-5 w-96 max-w-full animate-pulse rounded-lg" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-5">
        {SKELETON_CARDS.map((index) => (
          <div key={index} className="flex flex-col gap-3">
            <div className="bg-dz-cocoa-line aspect-4/5 animate-pulse rounded-[18px]" />
            <div className="bg-dz-cocoa-line h-5 w-32 animate-pulse rounded" />
            <div className="bg-dz-cocoa-line h-4 w-20 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
