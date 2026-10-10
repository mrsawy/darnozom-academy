'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Award } from 'lucide-react';
import InstructorCard4 from '@/components/organs/instructor-card-4';
import { Link } from '@/i18n/navigation';
import { ROUTE_INSTRUCTORS } from '@/lib/data/constants/routes.constants';
import { useFeaturedInstructors } from '@/lib/hooks/instructor/useFeaturedInstructors';
import { TeachersSectionSkeleton } from './teacher-section.skeleton';

function TeachersSection() {
  const t = useTranslations('TeachersSection');
  const { data: teachers = [], isLoading } = useFeaturedInstructors({ limit: 9 });

  if (isLoading) return <TeachersSectionSkeleton />;

  return (
    <section className="bg-section-bg py-24">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-6 text-4xl font-bold md:text-5xl">
            {t('title.explore')}{' '}
            <span className="xbg-gradient-to-r from-brand-purple to-brand-blue xtext-transparent ml-3 bg-clip-text">
              {t('title.teachers')}
            </span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">{t('description')}</p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <InstructorCard4 key={teacher._id} instructor={teacher} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href={ROUTE_INSTRUCTORS}>
            <Button
              size="lg"
              variant="outline"
              effect="expandIcon"
              icon={<Award />}
              iconPlacement="left">
              {t('viewAllButton')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default TeachersSection;
