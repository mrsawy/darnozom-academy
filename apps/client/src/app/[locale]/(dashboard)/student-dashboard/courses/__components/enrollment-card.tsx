'use client';

import { useState } from 'react';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { SubscriptionStatus } from '@/lib/types/subscription/subscription.enum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Progress } from '@/components/atoms/progress';
import { Award, BookOpen, Clock } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { UserRatingDisplay } from '@/components/organs/user-rating-display';
import { ReviewType } from '@/lib/types/review/review.types';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Typography } from '@/components/atoms/typography';
import { RenewalDialog } from '@/components/organs/renewal-dialog';
import { useRenewEnrollment } from '@/lib/hooks/enrollment/use-renew-enrollment.hook';
import { ROUTE_STUDENT_COURSE } from '@/lib/data/constants/routes.constants';
import { Image } from '@/components/molecules';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';

interface EnrollmentCardProps {
  enrollment: IEnrollment;
}

const getStatusColor = (status?: SubscriptionStatus) => {
  switch (status) {
    case SubscriptionStatus.ACTIVE: {
      return 'bg-green-500';
    }
    case SubscriptionStatus.EXPIRED: {
      return 'bg-red-500';
    }
    case SubscriptionStatus.CANCELLED:
    case SubscriptionStatus.SUSPENDED: {
      return 'bg-gray-500';
    }
    default: {
      return 'bg-blue-500';
    }
  }
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export function EnrollmentCard({ enrollment }: EnrollmentCardProps) {
  const t = useTranslations('StudentCourses.enrollmentCard');
  const router = useRouter();
  const tStatus = useTranslations('StudentCourses.subscriptionStatus');
  const { course, progressPercentage, timeSpentMinutes, subscription, certificate } = enrollment;

  const [renewOpen, setRenewOpen] = useState(false);
  const { handleRenew, isRenewing } = useRenewEnrollment(enrollment._id, {
    onCompleted: () => setRenewOpen(false),
  });

  const isExpired =
    (subscription?.status as SubscriptionStatus | undefined) === SubscriptionStatus.EXPIRED ||
    (subscription?.ends_at && new Date(subscription.ends_at) < new Date());

  if (!course) return null;

  const courseHref = ROUTE_STUDENT_COURSE(enrollment._id ?? '');

  return (
    <>
      <Card
        className={`overflow-hidden py-0 transition-shadow hover:shadow-lg ${isExpired ? 'border-red-300 bg-red-50/30' : ''}`}>
        <Link
          href={courseHref}
          className="focus-visible:ring-ring block outline-none focus-visible:ring-2">
          <div className="relative h-40 overflow-hidden sm:h-62">
            <Image
              src={getFileFullUrl(course.thumbnailKey)}
              alt={t('thumbnailAlt')}
              fill
              className="object-cover object-center"
            />
          </div>
        </Link>
        <CardHeader className="pt-6">
          <Link
            href={courseHref}
            className="text-foreground focus-visible:ring-ring block rounded-md transition-opacity outline-none hover:opacity-95 focus-visible:ring-2">
            <div className="flex items-start justify-between">
              <CardTitle className="line-clamp-2 text-lg font-semibold">{course.name}</CardTitle>
              <div className="flex gap-2">
                {subscription ? (
                  <Badge className={getStatusColor(subscription.status)}>
                    {tStatus(subscription.status)}
                  </Badge>
                ) : null}
                {certificate.issued ? (
                  <Badge variant="secondary">
                    <Award className="mr-1 h-3 w-3" />
                    {t('certified')}
                  </Badge>
                ) : null}
              </div>
            </div>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
              {course.shortDescription ?? course.description}
            </p>
          </Link>
        </CardHeader>

        <CardContent className="space-y-4 pb-6">
          <Link
            href={courseHref}
            className="text-foreground focus-visible:ring-ring block space-y-4 rounded-md transition-opacity outline-none hover:opacity-95 focus-visible:ring-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('progress')}</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span>{formatDuration(timeSpentMinutes)}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="text-muted-foreground h-4 w-4" />
                <span>{course.duration ?? t('selfPaced')}</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center justify-between gap-2">
            {course.stats ? (
              <Link
                href={courseHref}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-4 text-sm transition-colors outline-none focus-visible:ring-2">
                <span>{course.stats.averageRating.toFixed(1)}</span>
                <span>
                  {course.stats.totalEnrollments.toLocaleString()} {t('students')}
                </span>
              </Link>
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            <div className="shrink-0">
              <UserRatingDisplay
                reviewType={ReviewType.COURSE}
                entityId={course._id}
                showLabel={false}
                initialReview={course.userReview ?? null}
                cacheCourseId={course._id}
              />
            </div>
          </div>

          <div className="flex justify-between pt-2 text-sm">
            <span className="text-muted-foreground">
              {t('enrolled')} {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </span>
            {subscription?.ends_at ? (
              <span className={isExpired ? 'font-medium text-red-600' : 'text-muted-foreground'}>
                {isExpired
                  ? t('expired')
                  : `${t('expiresOn')} ${new Date(subscription.ends_at).toLocaleDateString()}`}
              </span>
            ) : null}
          </div>

          {isExpired ? (
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={() => setRenewOpen(true)}>
              {t('renewNow')}
            </Button>
          ) : (
            <Link href={courseHref} className="flex w-full justify-end">
              <Button
                size="sm"
                className="ms-auto h-8 p-4"
                onClick={() => router.push(courseHref)}
                effect="expandIcon">
                <Typography variant="small" className="text-accent-foreground">
                  {t('viewCourse')}
                </Typography>
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <RenewalDialog
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        onRenew={(billingCycle, paymentMethod) => {
          handleRenew(billingCycle, paymentMethod);
        }}
        courseName={course.name}
        isLoading={isRenewing}
      />
    </>
  );
}
