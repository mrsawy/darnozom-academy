'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlist,
} from '@/lib/hooks/wishlist/use-wishlist.hook';
import { ICourse } from '@/lib/types/course/course.interface';
import { useTranslations } from 'next-intl';

interface WishlistHeartButtonProps {
  courseId: string;
  course?: ICourse;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showText?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export default function WishlistHeartButton({
  courseId,
  course,
  className,
  size = 'md',
  variant = 'ghost',
  showText = false,
}: WishlistHeartButtonProps) {
  const t = useTranslations('WishlistHeartButton');
  // const isInWishlist = useIsInWishlist(courseId);
  const { data: wishlistData } = useWishlist({});
  const isInWishlist = wishlistData?.pages
    .flatMap((page) => page.docs)
    .some((item) => item.courseId === courseId);
  const addMutation = useAddToWishlist();
  const removeMutation = useRemoveFromWishlist();
  const isLoading = addMutation.isPending || removeMutation.isPending;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    await (isInWishlist
      ? removeMutation.mutateAsync(courseId)
      : addMutation.mutateAsync({ courseId, course }));
  };

  const isTextButton = showText && size === 'lg';

  return (
    <Button
      variant={isInWishlist ? 'outline' : variant}
      size={isTextButton ? 'lg' : 'icon'}
      className={cn(
        isTextButton ? 'w-full' : 'rounded-full',
        'gap-0 transition-all duration-200',
        !isTextButton && sizeClasses[size],
        isInWishlist === true &&
          'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500',
        isInWishlist === false && 'hover:bg-red-50 hover:text-zinc-300 dark:hover:bg-red-950/20',
        className
      )}
      onClick={(e) => {
        void handleClick(e);
      }}
      disabled={isLoading}
      data-in-wishlist={String(isInWishlist)}>
      <Heart
        className={cn(
          'transition-all duration-200',
          size === 'sm' && 'h-4 w-4',
          size === 'md' && 'h-5 w-5',
          size === 'lg' && 'h-5 w-5',
          isInWishlist === true && 'fill-red-500 text-red-500',
          isInWishlist === false && 'text-muted-foreground fill-none',
          '-translate-y-0.5'
        )}
      />
      {isTextButton ? <span className="ml-2">{isInWishlist ? t('remove') : t('add')}</span> : null}
    </Button>
  );
}
