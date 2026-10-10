'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  APP_SCREENS,
  FEATURE_ICONS,
  SCREEN_COUNT,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from './student-app-screens';

const AUTO_ADVANCE_MS = 4200;
/** Phones further than this from the active index are parked off-stage. */
const VISIBLE_RADIUS = 2;

/** Signed distance to `index` on a ring of `SCREEN_COUNT`, e.g. 5 -> -1 when active is 0. */
function ringOffset(index: number, activeIndex: number) {
  const raw = index - activeIndex;
  const half = SCREEN_COUNT / 2;
  if (raw > half) return raw - SCREEN_COUNT;
  if (raw < -half) return raw + SCREEN_COUNT;
  return raw;
}

function StudentAppCarousel() {
  const t = useTranslations('StudentAppSection');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = globalThis.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SCREEN_COUNT);
    }, AUTO_ADVANCE_MS);
    return () => globalThis.clearInterval(timer);
  }, [isPaused]);

  const step = useCallback((delta: number) => {
    setActiveIndex((current) => (current + delta + SCREEN_COUNT) % SCREEN_COUNT);
  }, []);

  const features = FEATURE_ICONS.map((Icon, index) => ({
    Icon,
    title: t(`features.${index}.title`),
    description: t(`features.${index}.description`),
  }));

  return (
    <section id="student-app" className="bg-muted/30 relative overflow-hidden py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 10%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 62%)',
        }}
      />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="border-accent/25 bg-accent/10 text-accent mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
            <Smartphone className="h-3.5 w-3.5" />
            {t('badge')}
          </span>
          <h2 className="text-foreground text-3xl leading-tight font-bold text-balance md:text-5xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-5 text-base text-pretty md:text-lg">
            {t('description')}
          </p>
        </div>

        {/* Coverflow stage */}
        <div
          className="relative mx-auto h-[30rem] max-w-5xl md:h-[36rem]"
          style={{ perspective: '1600px' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}>
          {APP_SCREENS.map((src, index) => {
            const offset = ringOffset(index, activeIndex);
            const distance = Math.abs(offset);
            const isActive = offset === 0;
            const isParked = distance > VISIBLE_RADIUS;

            return (
              <button
                key={src}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={t(`screens.${index}.label`)}
                aria-current={isActive}
                tabIndex={isParked ? -1 : 0}
                className={cn(
                  'absolute top-1/2 left-1/2 h-full origin-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none',
                  isActive ? 'cursor-default' : 'cursor-pointer'
                )}
                style={{
                  // Nearer phones must paint above farther ones (DOM order alone is not enough with 3D transforms).
                  zIndex: isParked ? 0 : 30 - distance * 10,
                  transform: [
                    'translate(-50%, -50%)',
                    `translateX(${offset * 46}%)`,
                    `translateZ(${-distance * 190}px)`,
                    `rotateY(${offset * -22}deg)`,
                    `scale(${isActive ? 1 : 0.9 - distance * 0.04})`,
                  ].join(' '),
                  // 3 depth levels: center + adjacent stay fully opaque; outer ring fades.
                  opacity: isParked ? 0 : distance <= 1 ? 1 : 1 - (distance - 1) * 0.4,
                  filter: isActive ? 'none' : `blur(${distance * 0.8}px)`,
                  pointerEvents: isParked ? 'none' : 'auto',
                }}>
                <Image
                  src={src}
                  alt={t(`screens.${index}.alt`)}
                  width={SCREEN_WIDTH}
                  height={SCREEN_HEIGHT}
                  sizes="(max-width: 768px) 60vw, 300px"
                  className="h-full w-auto drop-shadow-2xl select-none"
                  priority={index === 0}
                />
              </button>
            );
          })}
        </div>

        {/* Caption + controls */}
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-5 text-center">
          <div key={activeIndex} className="animate-[fadeIn_0.5s_ease-out]">
            <p className="text-primary text-xs font-bold tracking-[0.22em] uppercase">
              {t(`screens.${activeIndex}.label`)}
            </p>
            <p className="text-foreground mt-2 text-base leading-relaxed text-pretty md:text-lg">
              {t(`screens.${activeIndex}.caption`)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t('controls.previous')}
              className="border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 flex h-10 w-10 items-center justify-center rounded-full border transition-colors">
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>

            <div className="flex items-center gap-2">
              {APP_SCREENS.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={t(`screens.${index}.label`)}
                  aria-current={index === activeIndex}
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    index === activeIndex
                      ? 'bg-primary w-7'
                      : 'bg-border hover:bg-muted-foreground/50 w-2'
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t('controls.next')}
              className="border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 flex h-10 w-10 items-center justify-center rounded-full border transition-colors">
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="group border-border bg-card/70 hover:border-primary/40 rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="bg-primary/10 text-primary mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-foreground text-sm font-semibold">{title}</p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <p className="border-accent/40 text-muted-foreground mx-auto mt-12 max-w-2xl border-s-2 ps-4 text-sm leading-relaxed">
          <span className="text-foreground font-semibold">{t('whyLabel')}</span> {t('whyItMatters')}
        </p>
      </div>
    </section>
  );
}

export default StudentAppCarousel;
