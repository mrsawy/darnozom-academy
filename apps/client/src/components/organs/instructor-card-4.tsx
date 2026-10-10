'use client';

import { Card, CardContent } from '@/components/atoms/card';
import { Star, Users, BookOpen, ArrowRightIcon } from 'lucide-react';
import Image from 'next/image';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { IInstructor } from '@/lib/types/user/user.interface';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ROUTE_INSTRUCTOR_DETAIL } from '@/lib/data/constants/routes.constants';
import { Button } from '@/components/atoms/button';
import { Typography } from '@/components/atoms/typography';
import { BorderBeam } from '../atoms/border-beam';

const formatNumber = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default function InstructorCard4({ instructor }: { instructor: IInstructor }) {
  const t = useTranslations('Instructors');
  const avatarUrl = instructor.profile?.avatar
    ? getFileFullUrl(instructor.profile.avatar)
    : '/images/default-avatar.png';

  return (
    <Link href={ROUTE_INSTRUCTOR_DETAIL(instructor._id)}>
      <Card className="group bg-section-card border-border/50 hover:border-brand-purple/50 relative flex h-full cursor-pointer flex-col overflow-hidden py-0 transition-all duration-300 hover:shadow-2xl">
        {/* Image Overlay Header */}
        <div className="relative h-40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-2xl ring-4 ring-white/20 transition-transform duration-300 group-hover:scale-110">
              <Image
                src={avatarUrl}
                alt={`${instructor.firstName} ${instructor.lastName}`}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col p-6">
          {/* Name and Bio */}
          <div className="relative z-10 -mt-12 mb-4 text-center">
            <div className="bg-section-card border-border/50 rounded-lg border p-4 shadow-lg">
              <Typography
                as="h3"
                variant="h5"
                weight="bold"
                align="center"
                className="group-hover:text-brand-purple mb-1 flex justify-center transition-colors">
                {instructor.firstName} {instructor.lastName}
              </Typography>
              <Typography
                variant="small"
                color="muted"
                align="center"
                className="line-clamp-2 flex justify-center sm:text-center">
                {instructor.profile?.shortBio ?? instructor.profile?.bio ?? t('expertInstructor')}
              </Typography>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="border-border/50 mb-4 flex items-center justify-around gap-2 border-t pt-4">
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-1">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <Typography variant="span" size="sm" weight="bold">
                  {(instructor.averageCoursesRating ?? 0).toFixed(1)}
                </Typography>
              </div>
              <Typography variant="span" size="xs" color="muted">
                {t('rating')}
              </Typography>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-1">
                <Users className="h-4 w-4 text-blue-500" />
                <Typography variant="span" size="sm" weight="bold">
                  {formatNumber(instructor.totalStudents ?? 0)}
                </Typography>
              </div>
              <Typography variant="span" size="xs" color="muted">
                {t('students')}
              </Typography>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-purple-500" />
                <Typography variant="span" size="sm" weight="bold">
                  {instructor.totalCourses ?? 0}
                </Typography>
              </div>
              <Typography variant="span" size="xs" color="muted">
                {t('courses')}
              </Typography>
            </div>
          </div>

          {/* Categories */}
          {instructor.categories && instructor.categories.length > 0 ? (
            <div className="mb-4 flex flex-1 flex-wrap justify-center gap-2">
              {instructor.categories.slice(0, 2).map((category) => (
                <Typography
                  key={category._id}
                  variant="span"
                  size="xs"
                  weight="medium"
                  className="bg-brand-purple/10 text-brand-purple border-brand-purple/20 inline-flex items-center rounded-md border px-2 py-1">
                  {category.name}
                </Typography>
              ))}
            </div>
          ) : null}

          {/* Footer CTA */}
          <div className="border-border/50 text-brand-purple flex items-center justify-center gap-2 border-t pt-4 text-sm transition-all group-hover:gap-3">
            <Button
              variant="default" // your base style
              effect="expandIcon"
              icon={ArrowRightIcon}
              iconPlacement="right">
              {t('viewProfile')}
            </Button>
          </div>
        </CardContent>
        <BorderBeam
          duration={6}
          size={400}
          className="via-accent from-transparent to-transparent"
        />
        <BorderBeam
          duration={6}
          delay={3}
          size={400}
          borderWidth={2}
          className="via-primary from-transparent to-transparent"
        />
      </Card>
    </Link>
  );
}
