'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Bell, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useElementIsVisible } from '@/lib/hooks/use-element-is-visible';
import {
  APP_SCREENS,
  FEATURE_ICONS,
  NOTIFICATION_COUNT,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from './student-app-screens';

/**
 * The order the fan walks through — every mockup gets its turn in the front slot.
 * AI assistant (2c) opens in the middle from the start.
 */
const SCREEN_ORDER = [1, 0, 2, 3, 4, 5] as const;
const ORDER_LENGTH = SCREEN_ORDER.length;

/**
 * The three positions in the fan. `offset` is how far ahead of the front slot
 * that position sits in SCREEN_ORDER, so the whole fan shifts by one on every
 * tick. Further back = more rotation, more spread, smaller, and *less* parallax.
 */
const FAN_SLOTS = [
  { offset: -1, x: -58, y: -4, rotate: -11, scale: 0.82, depth: 0.4, z: 'z-10' },
  { offset: 1, x: 58, y: 2, rotate: 11, scale: 0.82, depth: 0.4, z: 'z-10' },
  { offset: 0, x: 0, y: 0, rotate: 0, scale: 1, depth: 1, z: 'z-20' },
] as const;

const ADVANCE_MS = 2600;
const NOTIFICATION_ROTATE_MS = 3200;
const PARALLAX_STRENGTH = 22;

/** Position in SCREEN_ORDER, wrapped. */
function orderPosition(cursor: number, offset: number) {
  return (cursor + offset + ORDER_LENGTH) % ORDER_LENGTH;
}

function StudentAppShowcase() {
  const t = useTranslations('StudentAppSection');
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useElementIsVisible(sectionRef, { threshold: 0.35 });
  const [cursor, setCursor] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [notificationIndex, setNotificationIndex] = useState(0);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    const timer = globalThis.setInterval(() => {
      setCursor((current) => (current + 1) % ORDER_LENGTH);
    }, ADVANCE_MS);
    return () => globalThis.clearInterval(timer);
  }, [isVisible, isPaused]);

  useEffect(() => {
    if (!isVisible) return;
    const timer = globalThis.setInterval(() => {
      setNotificationIndex((current) => (current + 1) % NOTIFICATION_COUNT);
    }, NOTIFICATION_ROTATE_MS);
    return () => globalThis.clearInterval(timer);
  }, [isVisible]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: (event.clientX - bounds.left) / bounds.width - 0.5,
      y: (event.clientY - bounds.top) / bounds.height - 0.5,
    });
  }, []);

  const resetPointer = useCallback(() => {
    setPointer({ x: 0, y: 0 });
    setHoveredSlot(null);
    setIsPaused(false);
  }, []);

  const features = FEATURE_ICONS.map((Icon, index) => ({
    Icon,
    title: t(`features.${index}.title`),
    description: t(`features.${index}.description`),
  }));

  const frontScreen = SCREEN_ORDER[cursor];

  return (
    <section
      ref={sectionRef}
      id="student-app-showcase"
      className="relative overflow-hidden py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 75% 30%, color-mix(in oklch, var(--accent) 10%, transparent), transparent 60%)',
        }}
      />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Copy */}
          <div>
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

            <div className="mt-9 space-y-5">
              {features.map(({ Icon, title, description }) => (
                <div key={title} className="group flex items-start gap-4">
                  <span className="border-border bg-card text-primary group-hover:border-primary/50 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-semibold md:text-base">{title}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="border-accent/40 text-muted-foreground mt-9 border-s-2 ps-4 text-sm leading-relaxed">
              <span className="text-foreground font-semibold">{t('whyLabel')}</span>{' '}
              {t('whyItMatters')}
            </p>
          </div>

          {/* Parallax fan */}
          <div className="flex -translate-y-10 scale-90 flex-col gap-6 sm:scale-100 md:-translate-y-0">
            <div
              onPointerMove={handlePointerMove}
              onPointerEnter={() => setIsPaused(true)}
              onPointerLeave={resetPointer}
              className="relative flex h-[28rem] items-center justify-center md:h-[36rem]"
              style={{ perspective: '1400px' }}>
              <div
                aria-hidden
                className="from-primary/25 via-accent/20 absolute inset-8 rounded-full bg-linear-to-br to-transparent blur-3xl"
              />

              {FAN_SLOTS.map((slot, slotIndex) => {
                const position = orderPosition(cursor, slot.offset);
                const slotScreen = SCREEN_ORDER[position];
                const isHovered = hoveredSlot === slotIndex;
                const isDimmed = hoveredSlot !== null && !isHovered;

                return (
                  <button
                    key={slot.offset}
                    type="button"
                    onPointerEnter={() => setHoveredSlot(slotIndex)}
                    onClick={() => setCursor(position)}
                    aria-label={t(`screens.${slotScreen}.label`)}
                    className={cn(
                      'absolute h-[88%] transition-all duration-500 ease-out focus-visible:outline-none',
                      slot.z,
                      isHovered && 'z-30',
                      slot.offset === 0 ? 'cursor-default' : 'cursor-pointer'
                    )}
                    style={{
                      aspectRatio: `${SCREEN_WIDTH} / ${SCREEN_HEIGHT}`,
                      transform: [
                        `translateX(calc(${slot.x}% + ${pointer.x * PARALLAX_STRENGTH * slot.depth}px))`,
                        `translateY(calc(${slot.y}% + ${pointer.y * PARALLAX_STRENGTH * slot.depth}px))`,
                        `rotateY(${pointer.x * -10 * slot.depth}deg)`,
                        `rotateZ(${slot.rotate}deg)`,
                        `scale(${isHovered ? slot.scale * 1.06 : slot.scale})`,
                      ].join(' '),
                      opacity: isDimmed ? 0.55 : 1,
                    }}>
                    {/* Continuous idle float, offset per slot so they never move in lockstep */}
                    <div
                      className="relative h-full w-full animate-[float_7s_ease-in-out_infinite]"
                      style={{ animationDelay: `${slotIndex * 1.1}s` }}>
                      {/* Every mockup is stacked in every slot; only the current one is
                          opaque, so a slot change cross-fades instead of hard-swapping. */}
                      {APP_SCREENS.map((src, screenIndex) => {
                        const isVisible = screenIndex === slotScreen;

                        return (
                          <Image
                            key={src}
                            src={src}
                            alt={isVisible ? t(`screens.${screenIndex}.alt`) : ''}
                            width={SCREEN_WIDTH}
                            height={SCREEN_HEIGHT}
                            sizes="(max-width: 768px) 45vw, 280px"
                            priority={screenIndex === SCREEN_ORDER[0]}
                            className={cn(
                              'absolute inset-0 h-full w-full object-contain drop-shadow-2xl transition-all duration-700 ease-out select-none',
                              isVisible
                                ? 'translate-y-0 scale-100 opacity-100'
                                : 'translate-y-3 scale-95 opacity-0'
                            )}
                          />
                        );
                      })}
                    </div>
                  </button>
                );
              })}

              {/* Floating notification cards anchored to the cluster */}
              <div className="pointer-events-none absolute inset-0 z-40">
                {Array.from({ length: NOTIFICATION_COUNT }, (_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'border-border/60 bg-card/95 absolute start-0 top-[14%] flex w-60 items-start gap-3 rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-all duration-700 ease-out',
                      index === notificationIndex
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-4 opacity-0'
                    )}>
                    <span className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-xs font-bold">
                        {t(`notifications.${index}.title`)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                        {t(`notifications.${index}.body`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption + step rail for the full mockup set */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div key={frontScreen} className="animate-[fadeIn_0.5s_ease-out]">
                <p className="text-primary text-[11px] font-bold tracking-[0.2em] uppercase">
                  {t(`screens.${frontScreen}.label`)}
                </p>
                <p className="text-muted-foreground mt-1.5 max-w-md text-sm leading-relaxed text-pretty">
                  {t(`screens.${frontScreen}.caption`)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {SCREEN_ORDER.map((screenIndex, position) => (
                  <button
                    key={screenIndex}
                    type="button"
                    onClick={() => setCursor(position)}
                    aria-label={t(`screens.${screenIndex}.label`)}
                    aria-current={position === cursor}
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      position === cursor
                        ? 'bg-primary w-8'
                        : 'bg-border hover:bg-muted-foreground/50 w-2'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentAppShowcase;
