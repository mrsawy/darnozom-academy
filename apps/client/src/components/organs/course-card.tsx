'use client';

import { ArrowLeft, ArrowRight, BookOpen, Star, TrendingUp, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { ICourse } from '@/lib/types/course/course.interface';
import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import WishlistHeartButton from '../molecules/wishlist-heart-button';
import Price from '../molecules/price';
import { Image } from '../molecules';
import {
  ROUTE_COURSE_DETAILS,
  ROUTE_INSTRUCTOR_DETAIL,
} from '@/lib/data/constants/routes.constants';
import { normalizeCourseSchoolTypes } from '@/lib/utils/course/normalize-course-school-types';

/** A course is "trending" once it has real volume behind a strong rating. */
function getIsTrending(course: ICourse) {
  return (
    (course.stats?.totalEnrollments ?? 0) >= 50 &&
    (course.stats?.averageRating ?? 0) >= 4 &&
    (course.stats?.totalReviews ?? 0) >= 10
  );
}

export default function CourseCard({ course }: { course: ICourse }) {
  const t = useTranslations('CourseCard');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const gradeName = course.grade ? (isArabic ? course.grade.nameAr : course.grade.nameEn) : null;
  const schoolTypeNames = normalizeCourseSchoolTypes(course).schoolTypes.map((schoolType) =>
    isArabic ? schoolType.nameAr : schoolType.nameEn
  );
  const primaryCategory = course.categories?.[0]?.name;

  const instructorId = course.instructor?._id ?? course.instructorId;
  const instructorName = course.instructor
    ? [course.instructor.firstName, course.instructor.lastName].filter(Boolean).join(' ')
    : '';
  const instructorAvatarKey = course.instructor?.profile?.avatar;
  const instructorAvatarSrc = instructorAvatarKey ? getFileFullUrl(instructorAvatarKey) : undefined;
  const instructorInitials =
    [course.instructor?.firstName?.[0], course.instructor?.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || '?';

  // The quiet line above the title: who it's for, and how much of it there is.
  const metaParts = [
    gradeName,
    ...schoolTypeNames,
    course.modulesIds?.length ? `${course.modulesIds.length} ${t('lessons')}` : null,
  ].filter(Boolean);

  return (
    <article className="bg-dz-paper-raised border-dz-line hover:border-dz-line-strong group flex flex-col overflow-hidden rounded-[20px] border transition-colors duration-300">
      <div className="bg-dz-sand relative aspect-16/10">
        <Link href={ROUTE_COURSE_DETAILS(course._id)}>
          <Image
            src={getFileFullUrl(course.thumbnailKey)}
            alt={t('thumbnailAlt')}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover object-center"
          />
        </Link>

        {primaryCategory ? (
          <span className="bg-dz-paper-raised text-dz-ink pointer-events-none absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold">
            {primaryCategory}
          </span>
        ) : null}

        {getIsTrending(course) ? (
          <span className="bg-dz-ink text-dz-paper-raised pointer-events-none absolute start-3 bottom-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
            <TrendingUp className="size-3" aria-hidden />
            {t('trending')}
          </span>
        ) : null}

        <div className="absolute end-2 top-2 z-10">
          <WishlistHeartButton courseId={course._id} course={course} size="sm" variant="ghost" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4.5">
        {metaParts.length > 0 ? (
          <div className="text-dz-ink-soft text-[13px] font-semibold">{metaParts.join(' · ')}</div>
        ) : null}

        <Link href={ROUTE_COURSE_DETAILS(course._id)}>
          <h3 className="font-display group-hover:text-dz-terracotta m-0 line-clamp-2 text-[21px] leading-[1.4] font-bold transition-colors">
            {course.name}
          </h3>
        </Link>

        {instructorName ? (
          <div className="text-dz-ink-soft flex items-center gap-2 text-[13px]">
            <Avatar className="border-dz-line size-6 shrink-0 border">
              {instructorAvatarSrc ? (
                <AvatarImage src={instructorAvatarSrc} alt={instructorName} />
              ) : null}
              <AvatarFallback className="text-[10px] font-semibold">
                {instructorInitials}
              </AvatarFallback>
            </Avatar>
            {instructorId ? (
              <Link
                href={ROUTE_INSTRUCTOR_DETAIL(instructorId)}
                className="hover:text-dz-terracotta truncate underline-offset-2 hover:underline">
                {instructorName}
              </Link>
            ) : (
              <span className="truncate">{instructorName}</span>
            )}
          </div>
        ) : null}

        <div className="text-dz-ink-soft flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px]">
          {course.stats?.averageRating ? (
            <span className="flex items-center gap-1">
              <Star className="text-dz-amber size-3.5 shrink-0 fill-current" aria-hidden />
              <span className="font-semibold">{course.stats.averageRating}</span>
              <span>({course.stats?.totalReviews ?? 0})</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {course.stats?.totalEnrollments ?? 0}
          </span>
          {course.settings?.certificateEnabled ? (
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5 shrink-0" aria-hidden />
              {t('certificateIncluded')}
            </span>
          ) : null}
        </div>

        <div className="border-dz-line mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <Price isPaid={course.isPaid} pricing={course.pricing} className="text-base!" />
          <Link
            href={ROUTE_COURSE_DETAILS(course._id)}
            className="text-dz-terracotta hover:text-dz-terracotta-deep inline-flex items-center gap-1 text-sm font-semibold transition-colors">
            {t('enrollNow')}
            <ArrowIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
