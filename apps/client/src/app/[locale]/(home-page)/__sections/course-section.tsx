'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SectionShell from '@/components/molecules/public-site/section-shell';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import CourseCard from '@/components/organs/course-card';
import { Link } from '@/i18n/navigation';
import { ANCHOR_HOME_COURSES, ROUTE_COURSES } from '@/lib/data/constants/routes.constants';
import CategoryFilter from './__components/category-filter';
import GradeSchoolTypeFilter from './__components/grade-school-type-filter';
import { useFeaturedCourses } from '@/lib/hooks/course/useFeaturedCourses';
import type { ILocalizedLookup } from '@/lib/types/course/course.interface';
import { normalizeCourseSchoolTypes } from '@/lib/utils/course/normalize-course-school-types';

const SKELETON_CARDS = [0, 1, 2, 3, 4, 5];

function uniqueLookups(items: (ILocalizedLookup | null | undefined)[]): ILocalizedLookup[] {
  const map = new Map<string, ILocalizedLookup>();
  for (const item of items) {
    if (item?._id) map.set(item._id, item);
  }
  return [...map.values()];
}

function CoursesSection() {
  const t = useTranslations('CoursesSection');
  const locale = useLocale();
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight;
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

  return (
    <SectionShell
      id={ANCHOR_HOME_COURSES.slice(1)}
      tone="paper"
      innerClassName="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <DisplayHeading>
            {t('title.featured')} <span className="text-dz-terracotta">{t('title.courses')}</span>
          </DisplayHeading>
          <p className="text-dz-ink-soft mt-2.5 mb-0 max-w-[540px]">{t('description')}</p>
        </div>
        <Link
          href={ROUTE_COURSES}
          className="text-dz-terracotta hover:text-dz-terracotta-deep inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[15px] font-semibold transition-colors">
          {t('viewAllButton')}
          <ArrowIcon className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <CategoryFilter categories={allCategories} />
        <GradeSchoolTypeFilter grades={availableGrades} schoolTypes={availableSchoolTypes} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-5">
        {isLoading ? (
          SKELETON_CARDS.map((index) => (
            <div
              key={index}
              className="bg-dz-paper-raised border-dz-line h-80 animate-pulse rounded-[20px] border"
            />
          ))
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <CourseCard key={course._id?.toString()} course={course} />
          ))
        ) : (
          <p className="text-dz-ink-soft col-span-full py-12 text-center text-lg">
            {t('noCoursesFound')}
          </p>
        )}
      </div>
    </SectionShell>
  );
}

export default CoursesSection;
