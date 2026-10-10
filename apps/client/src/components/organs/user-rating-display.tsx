'use client';

import { Star } from 'lucide-react';
import { ReviewModal } from './review-modal';
import { ReviewType } from '@/lib/types/review/review.types';
import type { IUserReview } from '@/lib/types/review/review.types';
import { Button } from '../atoms/button';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface UserRatingDisplayProps {
  reviewType: ReviewType;
  entityId: string;
  courseId?: string;
  showLabel?: boolean;
  initialReview: IUserReview | null;
  cacheCourseId: string;
  enrollmentId?: string;
}

export function UserRatingDisplay({
  reviewType,
  entityId,
  courseId,
  showLabel = true,
  initialReview,
  cacheCourseId,
  enrollmentId,
}: UserRatingDisplayProps) {
  const t = useTranslations('StudentCourses.userRatingDisplay');
  const userRating = initialReview?.rating ?? 0;

  return (
    <ReviewModal
      type={reviewType}
      entityId={entityId}
      courseId={courseId}
      initialReview={initialReview}
      cacheCourseId={cacheCourseId}
      enrollmentId={enrollmentId}
      trigger={
        <Button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
            }
          }}
          className={cn(
            'group flex items-center gap-1 transition-opacity hover:opacity-80',
            'rtl:flex-row!'
          )}
          variant="outline">
          {showLabel ? (
            <span className="m-1 text-sm">{userRating > 0 ? t('yourRating') : t('rateThis')}</span>
          ) : null}
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`size-4 ${userRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 group-hover:text-black'}`}
            />
          ))}
        </Button>
      }
    />
  );
}
