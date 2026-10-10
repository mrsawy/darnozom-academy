'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import SingleCourse from '../__sections/single-course';
import SingleCourseSkeleton from '../__sections/single-cource.skeleton';
import { usePublicCourseOverview } from '@/lib/hooks/course/useCourses';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { Button } from '@/components/atoms/button';

export default function SingleCoursePage() {
  const t = useTranslations('Courses');
  const params = useParams();
  const rawId = params.id;
  const courseId = typeof rawId === 'string' ? rawId : (rawId?.[0] ?? '');

  const courseQuery = usePublicCourseOverview(courseId);
  const userQuery = useAuthUser();

  if (courseQuery.isLoading) {
    return <SingleCourseSkeleton />;
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center text-sm">{t('courseNotFound')}</p>
        <Button type="button" variant="outline" onClick={() => void courseQuery.refetch()}>
          {t('tryAgain')}
        </Button>
      </div>
    );
  }

  return <SingleCourse course={courseQuery.data} user={userQuery.data ?? undefined} />;
}
