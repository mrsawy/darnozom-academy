'use client';

import { useState, useEffect, cloneElement, isValidElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import { Star } from 'lucide-react';
import { ReviewType, CreateReviewInput } from '@/lib/types/review/review.types';
import type { IUserReview } from '@/lib/types/review/review.types';
import { useUpsertReview } from '@/lib/hooks/review/useUpsertReview';
import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface ReviewModalProps {
  type: ReviewType;
  entityId: string;
  courseId?: string;
  /** Embedded review from enrollment / detailed course APIs (no separate fetch). */
  initialReview: IUserReview | null;
  cacheCourseId: string;
  enrollmentId?: string;
  trigger?: React.ReactNode;
}

function stopTriggerEvent(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function ReviewModal({
  type,
  entityId,
  courseId: _courseId,
  initialReview,
  cacheCourseId,
  enrollmentId,
  trigger,
}: ReviewModalProps) {
  const t = useTranslations('StudentCourses.reviewModal');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [existingReview, setExistingReview] = useState<IUserReview | null>(initialReview);
  const { mutateAsync, isPending } = useUpsertReview();

  useEffect(() => {
    if (!isOpen) {
      setExistingReview(initialReview);
    }
  }, [initialReview, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setRating(initialReview?.rating ?? 0);
    setComment(initialReview?.comment ?? '');
    setExistingReview(initialReview);
  }, [isOpen, initialReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t('pleaseSelectRating'));
      return;
    }

    const input: CreateReviewInput = {
      reviewType: type,
      rating,
      comment,
    };

    if (type === ReviewType.COURSE) input.courseId = entityId;
    if (type === ReviewType.MODULE) input.moduleId = entityId;
    if (type === ReviewType.CONTENT) input.contentId = entityId;

    try {
      await mutateAsync({
        input,
        cacheCourseId,
        enrollmentId,
      });
      toast.success(existingReview ? t('reviewUpdated') : t('reviewSubmitted'));
      setIsOpen(false);
      setRating(0);
      setComment('');
      setExistingReview(null);
    } catch {
      // useUpsertReview onError already shows toast
    }
  };

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onPointerDown={stopTriggerEvent}
      onClick={stopTriggerEvent}>
      <Star
        className={cn(
          'size-4',
          existingReview ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        )}
      />
      <span className="sr-only">
        {type === ReviewType.COURSE
          ? t('rateCourse')
          : type === ReviewType.MODULE
            ? t('rateModule')
            : t('rateContent')}
      </span>
    </Button>
  );

  const triggerChild =
    trigger &&
    isValidElement<{
      onClick?: React.MouseEventHandler<HTMLElement>;
      onPointerDown?: React.PointerEventHandler<HTMLElement>;
    }>(trigger)
      ? cloneElement(trigger, {
          onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            e.stopPropagation();
            trigger.props.onPointerDown?.(e);
          },
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation();
            trigger.props.onClick?.(e);
          },
        })
      : (trigger ?? defaultTrigger);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerChild}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDown={stopTriggerEvent}
        onClick={stopTriggerEvent}>
        <DialogHeader>
          <DialogTitle>
            {existingReview ? t('update') : t('rate')} {t('this')}{' '}
            {type === ReviewType.COURSE
              ? t('courseType')
              : type === ReviewType.MODULE
                ? t('moduleType')
                : t('contentType')}
          </DialogTitle>
          <DialogDescription>
            {existingReview ? t('updateDescription') : t('shareDescription')}
          </DialogDescription>
        </DialogHeader>
        <>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRating(star);
                  }}>
                  <Star
                    className={`h-8 w-8 ${(hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comment">{t('commentLabel')}</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('commentPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={(e) => {
                e.stopPropagation();
                void handleSubmit();
              }}
              disabled={isPending}>
              {isPending ? t('submitting') : existingReview ? t('updateReview') : t('submitReview')}
            </Button>
          </DialogFooter>
        </>
      </DialogContent>
    </Dialog>
  );
}
