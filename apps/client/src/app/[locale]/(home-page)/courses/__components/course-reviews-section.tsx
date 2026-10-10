'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import { Separator } from '@/components/atoms/separator';
import { Typography } from '@/components/atoms/typography';
import { useCourseReviews } from '@/lib/hooks/review/use-course-reviews.hook';
import type { CourseReviewListItem } from '@/lib/types/review/review.types';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

function reviewAuthorName(review: CourseReviewListItem): string {
  const u = review.user;
  if (!u) return '';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  const login = u.username?.trim();
  if (login) return login;
  return u.email?.trim() ?? '';
}

interface CourseReviewsSectionProps {
  courseId: string;
}

export function CourseReviewsSection({ courseId }: CourseReviewsSectionProps) {
  const t = useTranslations('Courses.singleCourse');
  const [open, setOpen] = useState(false);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } =
    useCourseReviews(courseId, { enabled: open });

  const reviews = useMemo(() => data?.pages.flatMap((p) => p.docs) ?? [], [data]);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;
    if (!open || !root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, threshold: 0, rootMargin: '80px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Card className="pt-4 pb-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-start transition-colors">
              <CardTitle className="text-base font-semibold">{t('studentReviews')}</CardTitle>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-5 w-5 shrink-0 transition-transform',
                  open && 'rotate-180'
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isError ? (
              <div className="text-center">
                <Typography
                  variant="p"
                  color="destructive"
                  size="sm"
                  weight="medium"
                  className="mb-1">
                  {t('reviewsError')}
                </Typography>
                <Typography variant="p" color="muted" size="sm">
                  {error instanceof Error ? error.message : t('reviewsErrorFallback')}
                </Typography>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="text-primary mb-3 h-8 w-8 animate-spin" />
                <Typography variant="p" color="muted" size="sm">
                  {t('reviewsLoading')}
                </Typography>
              </div>
            ) : reviews.length === 0 ? (
              <Typography variant="p" color="muted" size="sm" className="py-4 text-center">
                {t('reviewsEmpty')}
              </Typography>
            ) : (
              <div ref={scrollRootRef} className="max-h-[min(420px,55vh)] overflow-y-auto pr-1">
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <div key={review._id}>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage
                            src={
                              review.user?.avatar ? getFileFullUrl(review.user.avatar) : undefined
                            }
                            alt=""
                          />
                          <AvatarFallback>
                            {(reviewAuthorName(review) || '?')
                              .split(/\s+/)
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium">
                              {reviewAuthorName(review) || t('reviewsAnonymous')}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={String(review.rating)}>
                            {Array.from({ length: review.rating }, (_, i) => (
                              <Star key={i} className="fill-primary text-primary h-4 w-4" />
                            ))}
                          </div>
                          {review.comment ? (
                            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                              {review.comment}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {index < reviews.length - 1 ? <Separator className="mt-4" /> : null}
                    </div>
                  ))}
                </div>
                <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />
                {isFetchingNextPage ? (
                  <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                    <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                    <span>{t('reviewsLoadingMore')}</span>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
