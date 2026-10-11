'use client';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { Progress } from '@/components/atoms/progress';
import { ROUTE_STUDENT_COURSES } from '@/lib/data/constants/routes.constants';
import { SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import { Award, BookOpen, Clock, Loader2, Star, Users } from 'lucide-react';
import { CourseModules } from './course-modules';
import { useRouter } from '@/i18n/navigation';
import { UserRatingDisplay } from '@/components/organs/user-rating-display';
import { ReviewType } from '@/lib/types/review/review.types';
import { useTranslations } from 'next-intl';
import { useDetailedEnrolledCourse } from '@/lib/hooks/course/useDetailedEnrolledCourse';

interface CourseViewProps {
  enrollmentId: string;
}

export default function CourseView({ enrollmentId }: CourseViewProps) {
  const t = useTranslations('StudentCourses.courseView');
  const tStatus = useTranslations('StudentCourses.subscriptionStatus');
  const tCrumb = useTranslations('CourseBreadcrumb');
  const router = useRouter();
  const { data, isPending, isError } = useDetailedEnrolledCourse(enrollmentId);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">{t('courseNotFound')}</h2>
          <Button
            onClick={() => {
              router.back();
            }}>
            {t('goBack')}
          </Button>
        </div>
      </div>
    );
  }

  const { course, enrollment, progress, subscription } = data;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return t('durationFormat', { hours, mins });
  };

  return (
    <div className="min-h-screen bg-linear-to-br">
      <div className="container mx-auto px-4 py-8">
        <CourseBreadcrumb
          items={[
            { label: tCrumb('myCourses'), href: ROUTE_STUDENT_COURSES },
            { label: course.name },
          ]}
        />

        {/* Header */}
        <div className="mb-6 flex flex-col">
          <div className="mb-4 flex justify-end self-start">
            <UserRatingDisplay
              reviewType={ReviewType.COURSE}
              entityId={course._id}
              showLabel={false}
              initialReview={course.userReview ?? null}
              cacheCourseId={course._id}
              enrollmentId={enrollmentId}
            />
          </div>

          <div className="rounded-lg border p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h1 className="mb-3 text-3xl font-bold">{course.name}</h1>
                <p className="mb-4">{course.description}</p>

                <div className="mb-4 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>
                      {course.stats?.totalEnrollments.toLocaleString()} {t('students')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4" />
                    <span>
                      {course.stats?.averageRating.toFixed(1)} {t('rating')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.language}</span>
                  </div>
                </div>

                {course.learningObjectives.length > 0 && (
                  <div className="rounded-lg p-4">
                    <h3 className="mb-2 font-semibold">{t('whatYoullLearn')}</h3>
                    <ul className="space-y-1">
                      {course.learningObjectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 text-blue-500">✓</span>
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg p-4">
                  <h3 className="mb-3 font-semibold">{t('yourProgress')}</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{t('overallProgress')}</span>
                        <span>{enrollment.progressPercentage}%</span>
                      </div>
                      <Progress value={enrollment.progressPercentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="">{t('timeSpent')}</p>
                        <p className="font-semibold">
                          {formatDuration(enrollment.timeSpentMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="">{t('lastAccessed')}</p>
                        <p className="font-semibold">
                          {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {enrollment.certificate.issued ? (
                      <Badge className="w-full justify-center bg-green-500">
                        <Award className="mr-2 h-4 w-4" />
                        {t('certificateEarned')}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {subscription ? (
                  <div className="rounded-lg p-4">
                    <h3 className="mb-2 font-semibold">{t('subscription')}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('status')}</span>
                        <Badge
                          className={
                            subscription.status === SubscriptionStatus.ACTIVE ? 'bg-green-500' : '0'
                          }>
                          {tStatus(subscription.status)}
                        </Badge>
                      </div>
                      {subscription.next_billing ? (
                        <div className="flex justify-between">
                          <span>{t('nextBilling')}</span>
                          <span>{new Date(subscription.next_billing).toLocaleDateString()}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold">{t('courseContent')}</h2>
          <CourseModules
            modules={course.modules}
            completedModules={progress.completedModules}
            completedContents={progress.completedContents ?? []}
            courseId={course._id}
            enrollmentId={enrollmentId}
          />
        </div>
      </div>
    </div>
  );
}
