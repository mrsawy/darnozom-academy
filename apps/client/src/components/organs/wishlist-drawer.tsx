'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet';
import { Button } from '@/components/atoms/button';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/hooks/wishlist/use-wishlist.hook';
import { ICourse } from '@/lib/types/course/course.interface';
import { IWishlist } from '@/lib/types/wishlist/wishlist.interface';
import { Link, usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import Price from '@/components/molecules/price';
import { Typography } from '@/components/atoms/typography';
import { Separator } from '@/components/atoms/separator';
import WishlistHeartButton from '@/components/molecules/wishlist-heart-button';
import useUserStore from '@/lib/store/userStore';
import { isLocaleRootPathname } from '@/lib/utils/routes/is-locale-root-pathname';
import { useTranslations } from 'next-intl';
import { ROUTE_COURSES } from '@/lib/data/constants/routes.constants';

interface WishlistDrawerProps {
  children: React.ReactNode;
}

export function WishlistDrawer({ children }: WishlistDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations('WishlistDrawer');
  const tCourseCard = useTranslations('CourseCard');
  const user = useUserStore((s) => s.user);
  const isMarketingHome = isLocaleRootPathname(pathname);
  const listEnabled = !user || !isMarketingHome || open;
  const {
    data: wishlistData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useWishlist({}, 10, {
    enabled: listEnabled,
  });

  // Flatten all pages to get all wishlist items
  const wishlistItems = wishlistData?.pages.flatMap((page) => page.docs) ?? [];
  const totalCount = wishlistData?.pages[0]?.totalDocs ?? 0;

  // Filter items that have course data (should be all items now that we store course data in localStorage)
  const itemsWithCourses: (IWishlist & { course: ICourse })[] = wishlistItems
    .map((item) => {
      // If item has course data, use it
      if (item.course && typeof item.course === 'object') {
        return { ...item, course: item.course };
      }
      return null;
    })
    .filter((item): item is IWishlist & { course: ICourse } => item !== null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b-2">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>{t('countDescription', { count: totalCount })}</SheetDescription>
        </SheetHeader>

        <div
          className="custom-scrollbar h-[calc(100vh-120px)] overflow-y-auto pt-8"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'transparent transparent',
          }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Typography variant="p" color="muted">
                {t('loadingWishlist')}
              </Typography>
            </div>
          ) : wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Heart className="text-muted-foreground/30 mb-4 h-16 w-16" />
              <Typography variant="h3" className="mb-2">
                {t('emptyTitle')}
              </Typography>
              <Typography variant="p" color="muted" className="mb-6">
                {t('emptyDescription')}
              </Typography>
              <Button onClick={() => setOpen(false)} asChild>
                <Link href={ROUTE_COURSES}>{t('browseCourses')}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsWithCourses.map((item, index, arr) => {
                const course = item.course;

                return (
                  <div key={item._id} className="group px-5">
                    <div className="hover:bg-accent/50 flex gap-4 rounded-lg border p-4 transition-colors">
                      <Link
                        href={`/courses/${course._id}`}
                        className="relative shrink-0"
                        onClick={() => setOpen(false)}>
                        <div className="relative h-16 w-24 overflow-hidden rounded-md sm:h-20 sm:w-32">
                          <Image
                            src={getFileFullUrl(course.thumbnailKey ?? '')}
                            alt={course.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <Link
                            href={`/courses/${course._id}`}
                            className="min-w-0 flex-1"
                            onClick={() => setOpen(false)}>
                            <Typography
                              variant="h4"
                              weight="semibold"
                              className="group-hover:text-primary line-clamp-2 transition-colors">
                              {course.name}
                            </Typography>
                          </Link>
                          <WishlistHeartButton
                            courseId={course._id}
                            course={course}
                            size="sm"
                            variant="ghost"
                          />
                        </div>

                        {course.instructor ? (
                          <Typography variant="p" size="sm" color="muted" className="mb-2">
                            {tCourseCard('byInstructor')} {course.instructor.firstName}{' '}
                            {course.instructor.lastName}
                          </Typography>
                        ) : null}

                        <div className="flex items-center justify-between gap-2">
                          <Price isPaid={course.isPaid} pricing={course.pricing} />
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            onClick={() => setOpen(false)}>
                            <Link href={`/courses/${course._id}`}>{t('viewCourse')}</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {index !== arr.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {hasNextPage ? (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={() => {
                  void fetchNextPage();
                }}
                disabled={isFetchingNextPage}>
                {isFetchingNextPage ? t('loadingMore') : t('loadMore')}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
