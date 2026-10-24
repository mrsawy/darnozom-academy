'use client';

import { BookOpen, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { IInstructor } from '@/lib/types/user/user.interface';
import { Link } from '@/i18n/navigation';
import { ROUTE_INSTRUCTOR_DETAIL } from '@/lib/data/constants/routes.constants';
import { cn } from '@/lib/utils';

const DEFAULT_AVATAR = '/images/default-avatar.png';

const formatNumber = (value?: number) => {
  if (!value) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

interface InstructorCard4Props {
  instructor: IInstructor;
  /** Set on the cocoa band so the caption text stays legible. */
  onDark?: boolean;
}

/** Portrait-first instructor card: photo, name, speciality, then the numbers. */
export default function InstructorCard4({ instructor, onDark = false }: InstructorCard4Props) {
  const t = useTranslations('Instructors');
  const fullName = [instructor.firstName, instructor.lastName].filter(Boolean).join(' ');
  const avatarUrl = instructor.profile?.avatar
    ? getFileFullUrl(instructor.profile.avatar)
    : DEFAULT_AVATAR;
  const speciality =
    instructor.categories?.[0]?.name ??
    instructor.profile?.shortBio ??
    instructor.profile?.bio ??
    t('expertInstructor');

  const captionClass = onDark ? 'text-dz-cocoa-soft' : 'text-dz-ink-soft';

  return (
    <Link
      href={ROUTE_INSTRUCTOR_DETAIL(instructor._id)}
      className="group flex flex-col gap-3"
      aria-label={`${fullName} — ${t('viewProfile')}`}>
      <div
        className={cn(
          'relative aspect-4/5 overflow-hidden rounded-[18px]',
          onDark ? 'bg-dz-cocoa-line' : 'bg-dz-sand'
        )}>
        <Image
          src={avatarUrl}
          alt={fullName}
          fill
          sizes="(max-width: 768px) 50vw, 240px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div>
        <div className="font-display text-[21px] leading-[1.3] font-bold">{fullName}</div>
        <div className={cn('line-clamp-1 text-sm', captionClass)}>{speciality}</div>

        <div className={cn('mt-1.5 flex flex-wrap items-center gap-3 text-[13px]', captionClass)}>
          <span className="flex items-center gap-1">
            <Star className="text-dz-tan size-3.5 shrink-0 fill-current" aria-hidden />
            {(instructor.averageCoursesRating ?? 0).toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {formatNumber(instructor.totalStudents ?? 0)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5 shrink-0" aria-hidden />
            {instructor.totalCourses ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
