'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Users, Star, Play, BookOpen, TrendingUp } from 'lucide-react';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { ICourse } from '@/lib/types/course/course.interface';
import { Link } from '@/i18n/navigation';
import { ButtonArrowRight } from '@/components/molecules/button-arrow-right';
import { Typography } from '@/components/atoms/typography';
import { useTranslations, useLocale } from 'next-intl';
import WishlistHeartButton from '../molecules/wishlist-heart-button';
import Price from '../molecules/price';
import { Image } from '../molecules';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import {
  ROUTE_COURSE_DETAILS,
  ROUTE_INSTRUCTOR_DETAIL,
} from '@/lib/data/constants/routes.constants';
import { normalizeCourseSchoolTypes } from '@/lib/utils/course/normalize-course-school-types';

export default function CourseCard({ course }: { course: ICourse }) {
  const t = useTranslations('CourseCard');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const gradeName = course.grade ? (isArabic ? course.grade.nameAr : course.grade.nameEn) : null;
  const schoolTypeNames = normalizeCourseSchoolTypes(course).schoolTypes.map((st) =>
    isArabic ? st.nameAr : st.nameEn
  );
  const isTrending =
    (course.stats?.totalEnrollments ?? 0) >= 50 &&
    (course.stats?.averageRating ?? 0) >= 4 &&
    (course.stats?.totalReviews ?? 0) >= 10;
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

  return (
    <Card
      key={course._id?.toString()}
      className="bg-section-card border-border/50 hover:border-brand-purple/30 group relative flex flex-col justify-between gap-0 py-0 transition-all duration-300 hover:shadow-lg">
      <CardHeader className="p-0">
        <Link href={ROUTE_COURSE_DETAILS(course._id)}>
          {/* Course Thumbnail */}
          <div className={`h-48 sm:h-56 md:h-72 ${course.thumbnailKey} relative overflow-hidden`}>
            <Image
              src={getFileFullUrl(course.thumbnailKey)}
              alt={t('thumbnailAlt')}
              fill
              className="fixed top-0 size-full rounded-t-xl object-cover object-center"
            />
            <div className="absolute inset-0" />
            {/* Wishlist Button */}
            <div className="absolute top-1 right-1 z-10 sm:top-4 sm:right-4">
              <WishlistHeartButton
                courseId={course._id}
                course={course}
                size="sm"
                variant="ghost"
              />
            </div>
            {/* Trending Badge */}
            {isTrending ? (
              <Badge className="bg-primary/40 absolute top-1 left-1 px-1.5 py-0.5 text-sm sm:top-4 sm:left-4 sm:px-2 sm:text-sm">
                <TrendingUp className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />
                <Typography
                  variant="span"
                  size="sm"
                  weight="medium"
                  className="text-accent-foreground text-xs sm:text-sm">
                  {t('trending')}
                </Typography>
              </Badge>
            ) : null}

            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <div className="flex size-6 scale-0 transform items-center justify-center rounded-full bg-black/10 backdrop-blur-sm transition-all duration-300 ease-in-out group-hover:scale-100 sm:size-12">
                <Play className="ml-0.5 size-2 transition-transform duration-300 group-hover:scale-110 sm:ml-1 sm:size-5" />
              </div>
            </div>
            {/* Category */}
            <div className="absolute bottom-1 left-1 flex flex-wrap gap-0.5 border-white/30 sm:bottom-4 sm:left-4 sm:gap-1">
              {course.categories && course.categories.length > 0
                ? course.categories.slice(0, 2).map((category) => (
                    <Badge
                      key={category._id || category.name}
                      variant="default"
                      className="px-1.5 py-0.5 text-sm sm:px-2 sm:text-sm">
                      <Typography
                        variant="p"
                        size="sm"
                        weight="medium"
                        className="text-accent-foreground text-xs sm:text-sm">
                        {category.name}
                      </Typography>
                    </Badge>
                  ))
                : null}
            </div>
          </div>
        </Link>
      </CardHeader>

      <CardContent className="flex h-full flex-col justify-between p-2 px-2.5 sm:p-2 sm:px-6">
        {/* Course Info */}
        <div>
          <div className="mb-2.5 flex items-center justify-start py-1 text-start sm:mb-3">
            <div className="flex items-center justify-center gap-1.5 sm:gap-1">
              <Star className="mb-[3px] h-4 w-4 shrink-0 fill-current text-yellow-500 sm:h-4 sm:w-4" />
              <Typography
                variant="span"
                size="sm"
                color="muted"
                className="text-start text-sm leading-0 font-semibold sm:text-base">
                {course.stats?.averageRating}
              </Typography>
              <Typography
                variant="span"
                size="sm"
                color="muted"
                className="text-start text-sm sm:text-base">
                ({course.stats?.totalReviews})
              </Typography>
            </div>
          </div>
          <Link href={ROUTE_COURSE_DETAILS(course._id)} className="text-start">
            <Typography
              variant="h4"
              weight="bold"
              className="mb-1 line-clamp-2 text-start text-sm leading-tight sm:mb-2 sm:text-lg sm:leading-normal md:text-lg">
              {course.name}
            </Typography>
          </Link>

          {course.description ? (
            <Typography
              variant="p"
              size="sm"
              className="mb-1.5 line-clamp-2 text-start text-sm leading-tight sm:mb-4 sm:text-sm sm:leading-normal">
              {course.description}
            </Typography>
          ) : null}
        </div>

        {course.instructor && instructorName ? (
          <div className="mb-1.5 flex items-center gap-2 sm:mb-4">
            {instructorId ? (
              <Link
                href={ROUTE_INSTRUCTOR_DETAIL(instructorId)}
                className="hover:text-primary flex min-w-0 items-center gap-2 underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}>
                <Avatar className="size-7 shrink-0 border sm:size-8">
                  {instructorAvatarSrc ? (
                    <AvatarImage src={instructorAvatarSrc} alt={instructorName} />
                  ) : null}
                  <AvatarFallback className="text-xs font-semibold">
                    {instructorInitials}
                  </AvatarFallback>
                </Avatar>
                <Typography
                  variant="p"
                  size="sm"
                  color="purple"
                  weight="medium"
                  className="my-auto! truncate text-start text-sm sm:text-sm">
                  {instructorName}
                </Typography>
              </Link>
            ) : (
              <>
                <Avatar className="size-7 shrink-0 sm:size-8">
                  {instructorAvatarSrc ? (
                    <AvatarImage src={instructorAvatarSrc} alt={instructorName} />
                  ) : null}
                  <AvatarFallback className="text-xs font-semibold">
                    {instructorInitials}
                  </AvatarFallback>
                </Avatar>
                <Typography
                  variant="p"
                  size="sm"
                  color="purple"
                  weight="medium"
                  className="truncate text-start text-sm sm:text-sm">
                  {t('byInstructor')} {instructorName}
                </Typography>
              </>
            )}
          </div>
        ) : null}

        {/* Course Stats */}
        <div className="mb-1.5 grid grid-cols-2 gap-1 sm:mb-4 sm:gap-4">
          <div className="flex items-center gap-0.5 text-start sm:gap-2">
            <Users className="text-muted-foreground h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <Typography
              variant="span"
              size="sm"
              color="muted"
              className="text-start text-sm leading-tight sm:text-sm">
              {course.stats?.totalEnrollments}
            </Typography>
          </div>
          <div className="flex items-center gap-0.5 text-start sm:gap-2">
            <BookOpen className="text-muted-foreground h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <Typography
              variant="span"
              size="sm"
              color="muted"
              className="text-start text-sm leading-tight sm:text-sm">
              {course.modulesIds?.length} {t('lessons')}
            </Typography>
          </div>
        </div>

        {/* Grade / School Type */}
        {gradeName || schoolTypeNames.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap gap-1 sm:mb-4">
            {gradeName ? (
              <Badge variant="outline" className="w-fit px-1.5 py-0.5 text-sm sm:px-2 sm:text-sm">
                <Typography
                  variant="span"
                  size="sm"
                  weight="medium"
                  className="text-start text-xs sm:text-sm">
                  {gradeName}
                </Typography>
              </Badge>
            ) : null}
            {schoolTypeNames.map((schoolTypeName) => (
              <Badge
                key={schoolTypeName}
                variant="outline"
                className="w-fit px-1.5 py-0.5 text-sm sm:px-2 sm:text-sm">
                <Typography
                  variant="span"
                  size="sm"
                  weight="medium"
                  className="text-start text-xs sm:text-sm">
                  {schoolTypeName}
                </Typography>
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Certificate Badge */}
        {course.settings?.certificateEnabled ? (
          <Badge
            variant="secondary"
            className="text-brand-purple border-brand-purple/20 mb-1.5 w-fit px-1.5 py-0.5 text-sm sm:mb-4 sm:px-2 sm:text-sm">
            <Typography
              variant="span"
              size="sm"
              weight="medium"
              className="text-start text-sm sm:text-sm">
              {t('certificateIncluded')}
            </Typography>
          </Badge>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-1.5 p-2 px-2.5 pt-0 sm:gap-4 sm:p-6">
        <div className="text-start">
          <Price isPaid={course.isPaid} pricing={course.pricing} />
        </div>
        <Link href={ROUTE_COURSE_DETAILS(course._id)} className="text-start">
          <ButtonArrowRight className="h-7 py-0 sm:h-10 sm:py-2">{t('enrollNow')}</ButtonArrowRight>
        </Link>
      </CardFooter>
    </Card>
  );
}
