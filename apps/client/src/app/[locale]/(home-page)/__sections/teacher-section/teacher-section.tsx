'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SectionShell from '@/components/molecules/public-site/section-shell';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import InstructorCard4 from '@/components/organs/instructor-card-4';
import { Link } from '@/i18n/navigation';
import { ANCHOR_HOME_INSTRUCTORS, ROUTE_INSTRUCTORS } from '@/lib/data/constants/routes.constants';
import { useFeaturedInstructors } from '@/lib/hooks/instructor/useFeaturedInstructors';
import { TeachersSectionSkeleton } from './teacher-section.skeleton';

function TeachersSection() {
  const t = useTranslations('TeachersSection');
  const locale = useLocale();
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight;
  const { data: teachers = [], isLoading } = useFeaturedInstructors({ limit: 9 });

  if (isLoading) return <TeachersSectionSkeleton />;

  return (
    <SectionShell
      id={ANCHOR_HOME_INSTRUCTORS.slice(1)}
      tone="cocoa"
      innerClassName="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <DisplayHeading>
            {t('title.explore')} <span className="text-dz-tan">{t('title.teachers')}</span>
          </DisplayHeading>
          <p className="text-dz-cocoa-soft mt-2.5 mb-0 max-w-[540px]">{t('description')}</p>
        </div>
        <Link
          href={ROUTE_INSTRUCTORS}
          className="text-dz-tan inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[15px] font-semibold transition-opacity hover:opacity-80">
          {t('viewAllButton')}
          <ArrowIcon className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-5">
        {teachers.map((teacher) => (
          <InstructorCard4 key={teacher._id} instructor={teacher} onDark />
        ))}
      </div>
    </SectionShell>
  );
}

export default TeachersSection;
