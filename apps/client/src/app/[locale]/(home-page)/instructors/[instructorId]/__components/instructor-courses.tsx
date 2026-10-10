'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { BookOpen, Loader2 } from 'lucide-react';
import { IInstructor } from '@/lib/types/user/user.interface';
import { useCoursesByInstructor } from '@/lib/hooks/course/useCourses';
import CourseCard from '@/components/organs/course-card';
import { ICourse } from '@/lib/types/course/course.interface';
import { Typography } from '@/components/atoms/typography';
import { useTranslations } from 'next-intl';

interface Props {
  instructor: IInstructor;
}

function InstructorCourses({ instructor }: Props) {
  const t = useTranslations('Instructors');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } =
    useCoursesByInstructor(instructor._id, 12);

  // Flatten all pages into a single array - memoized to prevent infinite loop in useEffect
  const courses = useMemo<ICourse[]>(() => {
    return data?.pages.flatMap((page) => page.docs ?? []) ?? [];
  }, [data]);
  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="text-primary h-6 w-6" />
          <Typography variant="h3" weight="bold">
            {t('courses')}
          </Typography>
          {instructor.totalCourses !== undefined && instructor.totalCourses > 0 && (
            <Typography variant="span" size="base" weight="normal" color="muted" className="ml-2">
              ({courses.length ?? 0})
            </Typography>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Typography variant="p" color="destructive" size="lg" weight="medium" className="mb-2">
              {t('errorLoadingCourses')}
            </Typography>
            <Typography variant="p" color="muted" size="sm" className="opacity-70">
              {error instanceof Error ? error.message : t('tryAgainLater')}
            </Typography>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
            <Typography variant="p" color="muted" size="sm">
              {t('loadingCourses')}
            </Typography>
          </div>
        ) : courses.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-4 w-full" />
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
                <Typography variant="span" color="muted" size="sm" className="ml-2">
                  {t('loadingMoreCourses')}
                </Typography>
              </div>
            ) : null}
            {!hasNextPage && courses.length > 0 && (
              <Typography variant="p" color="muted" size="sm" align="center" className="py-4">
                {t('noMoreCourses')}
              </Typography>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="text-muted-foreground/50 mb-4 h-12 w-12" />
            <Typography variant="p" color="muted" size="lg" weight="medium" className="mb-2">
              {t('noCoursesAvailable')}
            </Typography>
            <Typography variant="p" color="muted" size="sm" className="opacity-70">
              {t('noCoursesPublished')}
            </Typography>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InstructorCourses;
