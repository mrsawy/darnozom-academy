'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { BookOpen } from 'lucide-react';
import CourseCard from '../../../../components/organs/course-card';
import { Link } from '@/i18n/navigation';
import { ROUTE_COURSES } from '@/lib/data/constants/routes.constants';
import CategoryFilter from './__components/category-filter';
import GradeSchoolTypeFilter from './__components/grade-school-type-filter';
import { useFeaturedCourses } from '@/lib/hooks/course/useFeaturedCourses';
import type { ILocalizedLookup } from '@/lib/types/course/course.interface';
import { normalizeCourseSchoolTypes } from '@/lib/utils/course/normalize-course-school-types';

function uniqueLookups(items: (ILocalizedLookup | null | undefined)[]): ILocalizedLookup[] {
  const map = new Map<string, ILocalizedLookup>();
  for (const item of items) {
    if (item?._id) map.set(item._id, item);
  }
  return [...map.values()];
}

function CoursesSection() {
  const t = useTranslations('CoursesSection');
  const searchParams = useSearchParams();
  const allText = t('all');
  const selectedCategory = searchParams.get('category') ?? allText;
  const selectedGrade = searchParams.get('grade') ?? undefined;
  const selectedSchoolType = searchParams.get('schoolType') ?? undefined;

  const { data: courses = [], isLoading } = useFeaturedCourses({ limit: 9 });

  const allCategories = useMemo(
    () =>
      [
        allText,
        ...new Set(
          courses
            .flatMap((course) => course.categories)
            .filter((category) => !!category)
            .map((category) => category?.name)
        ),
      ].slice(0, 7),
    [courses, allText]
  );

  const availableGrades = useMemo(
    () => uniqueLookups(courses.map((course) => course.grade)),
    [courses]
  );

  const availableSchoolTypes = useMemo(
    () =>
      uniqueLookups(courses.flatMap((course) => normalizeCourseSchoolTypes(course).schoolTypes)),
    [courses]
  );

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesCategory =
          selectedCategory === allText ||
          course.categories?.some((category) => category?.name === selectedCategory);
        const matchesGrade = !selectedGrade || course.grade?._id === selectedGrade;
        const schoolTypeIds = normalizeCourseSchoolTypes(course).schoolTypeIds;
        const matchesSchoolType = !selectedSchoolType || schoolTypeIds.includes(selectedSchoolType);
        return matchesCategory && matchesGrade && matchesSchoolType;
      }),
    [courses, selectedCategory, selectedGrade, selectedSchoolType, allText]
  );

  if (isLoading) {
    return (
      <section className="bg-section-bg py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <div className="bg-muted mx-auto mb-6 h-12 w-80 animate-pulse rounded-lg" />
            <div className="bg-muted mx-auto mb-8 h-6 w-96 animate-pulse rounded-lg" />
          </div>
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted h-72 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-section-bg py-24">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-6 text-4xl font-bold md:text-5xl">
            {t('title.featured')}{' '}
            <span className="xbg-gradient-to-r from-brand-purple to-brand-blue xtext-transparent ml-3 bg-clip-text">
              {t('title.courses')}
            </span>
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl">{t('description')}</p>

          <CategoryFilter categories={allCategories} />

          <GradeSchoolTypeFilter grades={availableGrades} schoolTypes={availableSchoolTypes} />
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <CourseCard key={course._id?.toString()} course={course} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-muted-foreground text-lg">{t('noCoursesFound')}</p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <Link href={ROUTE_COURSES}>
            <Button
              size="lg"
              variant="outline"
              effect="expandIcon"
              icon={<BookOpen />}
              iconPlacement="left">
              {t('viewAllButton')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CoursesSection;
