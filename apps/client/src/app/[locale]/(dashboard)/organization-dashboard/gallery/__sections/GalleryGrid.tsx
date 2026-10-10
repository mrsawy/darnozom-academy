'use client';

import { useRef, useEffect } from 'react';
import { GalleryItem as IGalleryItem } from '@/lib/hooks/gallery/useGallery';
import { GalleryItem } from '../__components/GalleryItem';
import { useTranslations } from 'next-intl';

interface GalleryGridProps {
  items: IGalleryItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onItemClick: (index: number) => void;
  onCopy: (url: string) => void;
  onDelete: (id: string) => Promise<void>;
  deleting?: boolean;
}

export function GalleryGrid({
  items,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onItemClick,
  onCopy,
  onDelete,
  deleting = false,
}: GalleryGridProps) {
  const t = useTranslations('GalleryGrid');
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      },
      { threshold: 1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, onLoadMore]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted aspect-square animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <GalleryItem
            key={item._id}
            item={item}
            onCopy={onCopy}
            onClick={() => onItemClick(index)}
            onDelete={onDelete}
            deleting={deleting}
          />
        ))}
      </div>

      {/* Loading More Indicator */}
      {hasMore ? (
        <div ref={observerTarget} className="flex justify-center py-6">
          {loadingMore ? (
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          ) : (
            <span className="text-muted-foreground text-sm">{t('scrollForMore')}</span>
          )}
        </div>
      ) : null}
    </>
  );
}
