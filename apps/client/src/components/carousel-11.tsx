'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/index';
import type { LogoItem } from '@/components/organs/LogoLoop';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/atoms/carousel';

function isNodeItem(item: LogoItem): item is Extract<LogoItem, { node: React.ReactNode }> {
  return 'node' in item;
}

function slideKey(item: LogoItem, index: number): string {
  if (isNodeItem(item)) {
    return `node-${index}-${item.title ?? item.ariaLabel ?? index}`;
  }
  return `img-${index}-${item.src}`;
}

export interface LogoLoopSlideCarouselProps {
  items: LogoItem[];
  /** Region label for accessibility (e.g. translated features loop label). */
  ariaLabel?: string;
  /** Delay between automatic advances until the user interacts. Default 3200. */
  autoScrollIntervalMs?: number;
  className?: string;
  /** Basis width for each slide (Tailwind), default ~33% viewport for peek effect. */
  itemBasisClassName?: string;
}

export default function LogoLoopSlideCarousel({
  items,
  ariaLabel,
  autoScrollIntervalMs = 3200,
  className,
  itemBasisClassName = 'basis-[33%]',
}: LogoLoopSlideCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [userInteracted, setUserInteracted] = React.useState(false);
  const interactedRef = React.useRef(false);

  const markInteracted = React.useCallback(() => {
    interactedRef.current = true;
    setUserInteracted(true);
  }, []);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  React.useEffect(() => {
    if (!api || userInteracted || items.length < 2) {
      return;
    }

    const prefersReduced =
      globalThis.window !== undefined &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      return;
    }

    const id = globalThis.setInterval(() => {
      if (interactedRef.current) {
        return;
      }
      api.scrollNext();
    }, autoScrollIntervalMs);

    return () => globalThis.clearInterval(id);
  }, [api, userInteracted, items.length, autoScrollIntervalMs]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('mx-auto max-w-xs', className)}
      aria-label={ariaLabel}
      onPointerDownCapture={markInteracted}
      onKeyDownCapture={(e) => {
        if (
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'Home' ||
          e.key === 'End'
        ) {
          markInteracted();
        }
      }}>
      <Carousel className="w-full max-w-xs" opts={{ loop: true }} setApi={setApi}>
        <CarouselContent className="py-3">
          {items.map((item, index) => {
            const isActive = index === current;
            return (
              <CarouselItem
                className={cn('aspect-square', itemBasisClassName)}
                key={slideKey(item, index)}>
                {isNodeItem(item) ? (
                  <div
                    className={cn(
                      'flex size-full flex-col items-center justify-center transition-transform duration-300',
                      isActive ? 'scale-100' : 'scale-[0.6] opacity-80'
                    )}>
                    {item.node}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={item.alt ?? item.title ?? ''}
                    className={cn(
                      'size-full rounded-xl object-cover transition-transform duration-300',
                      isActive ? 'scale-100' : 'scale-[0.6]'
                    )}
                    decoding="async"
                    draggable={false}
                    height={item.height}
                    loading="lazy"
                    sizes={item.sizes}
                    src={item.src}
                    srcSet={item.srcSet}
                    title={item.title}
                    width={item.width}
                  />
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
