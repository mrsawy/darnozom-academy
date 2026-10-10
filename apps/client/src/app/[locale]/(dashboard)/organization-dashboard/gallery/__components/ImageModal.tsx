'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
// eslint-disable-next-line import/no-named-as-default
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import { GalleryItem } from '@/lib/hooks/gallery/useGallery';
import { IconTrash } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface ImageModalProps {
  items: GalleryItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

export function ImageModal({
  items,
  initialIndex,
  isOpen,
  onClose,
  onDelete,
  deleting = false,
}: ImageModalProps) {
  const t = useTranslations('ImageModal');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const prevSlidesLengthRef = useRef(0);
  const currentSlideIndexRef = useRef(0);
  const prevInitialIndexRef = useRef<number | null>(null);
  const slidesLengthRef = useRef(0);

  // Convert gallery items to lightbox slides
  const slides = useMemo(() => {
    return items
      .filter((item) => item.type?.startsWith('image/'))
      .map((item) => ({
        src: item.url,
        alt: item.title ?? 'Gallery Image',
        title: item.title,
        description: new Date(item.createdAt).toLocaleDateString(),
        // Store the original item for delete functionality
        _galleryItem: item,
      }));
  }, [items]);

  // Update slides length ref
  useEffect(() => {
    slidesLengthRef.current = slides.length;
  }, [slides.length]);

  // Find the current index in the filtered slides
  const startIndex = useMemo(() => {
    if (slides.length === 0) return 0;

    // 1. Get the actual item clicked using initialIndex from the full list
    const targetItem = items[initialIndex];
    if (!targetItem) return 0;

    // 2. Find this item's index in the filtered slides
    const foundIndex = slides.findIndex((slide) => slide._galleryItem._id === targetItem._id);
    return Math.max(foundIndex, 0);
  }, [initialIndex, items, slides]);

  // Initialize/reset current slide index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      // Reset to startIndex whenever modal opens or initialIndex changes
      if (prevInitialIndexRef.current !== initialIndex) {
        setCurrentSlideIndex(startIndex);
        currentSlideIndexRef.current = startIndex;
        prevInitialIndexRef.current = initialIndex;
      }
    } else {
      // Reset when modal closes
      prevInitialIndexRef.current = null;
    }
  }, [isOpen, startIndex, initialIndex]);

  // Update ref when currentSlideIndex changes
  useEffect(() => {
    currentSlideIndexRef.current = currentSlideIndex;
  }, [currentSlideIndex]);

  // Close modal if no items remain
  useEffect(() => {
    if (slides.length === 0 && isOpen) {
      onClose();
    }
  }, [slides.length, isOpen, onClose]);

  // Adjust index when slides are deleted (only when length actually decreases)
  useEffect(() => {
    if (!isOpen) {
      prevSlidesLengthRef.current = slides.length;
      return;
    }

    const currentLength = slides.length;
    const prevLength = prevSlidesLengthRef.current;

    // Only adjust if slides were deleted (length decreased)
    if (prevLength > 0 && currentLength < prevLength) {
      const currentIndex = currentSlideIndexRef.current;
      if (currentIndex >= currentLength) {
        const newIndex = Math.max(0, currentLength - 1);
        setCurrentSlideIndex(newIndex);
        currentSlideIndexRef.current = newIndex;
      }
    }

    prevSlidesLengthRef.current = currentLength;
  }, [slides.length, isOpen]);

  const currentSlide = slides[currentSlideIndex];

  // Use ref for slides.length to avoid recreating callback
  const handleView = useCallback(({ index }: { index: number }) => {
    if (index >= 0 && index < slidesLengthRef.current) {
      setCurrentSlideIndex(index);
      currentSlideIndexRef.current = index;
    }
  }, []); // Empty dependency array - stable reference

  const handleDelete = useCallback(() => {
    if (!currentSlide) return;
    if (globalThis.confirm(t('deleteConfirm'))) {
      onDelete(currentSlide._galleryItem._id);
      if (items.length === 1) {
        onClose();
      }
    }
  }, [currentSlide, onDelete, items.length, onClose, t]);

  if (slides.length === 0) return null;

  return (
    <>
      <Lightbox
        open={isOpen}
        close={onClose}
        index={currentSlideIndex}
        slides={slides}
        plugins={[Thumbnails, Captions, Counter]}
        thumbnails={{
          position: 'bottom',
          width: 120,
          height: 80,
          border: 0,
          borderRadius: 4,
          padding: 4,
          gap: 8,
        }}
        captions={{
          descriptionTextAlign: 'center',
          descriptionMaxLines: 1,
        }}
        counter={{
          container: { style: { top: 'unset', bottom: '16px' } },
        }}
        on={{
          view: handleView,
        }}
      />
      {/* Custom Delete Button Overlay - positioned below close button */}
      {isOpen && currentSlide ? (
        <div className="pointer-events-auto fixed top-20 right-4 z-[9999]" style={{ zIndex: 9999 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleting}
            aria-label={t('deleteImage')}
            title={t('deleteImage')}
            className={`flex h-11 w-11 items-center justify-center rounded-lg border-none p-0 text-white shadow-lg backdrop-blur-sm transition-all duration-200 ${deleting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'} `}
            style={{
              backgroundColor: deleting ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.6)',
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
              }
            }}>
            <IconTrash size={20} strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </>
  );
}
