'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BellRing,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Layers,
  MessagesSquare,
  Palette,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { BorderBeam } from '@/components/atoms/border-beam';
import { cn } from '@/lib/utils';

/**
 * Each tile owns a hue so the mosaic reads as a system rather than seven copies
 * of the same card. Values are design tokens, so they flip with the theme.
 */
const CAPABILITIES = [
  { Icon: Layers, accent: 'var(--primary)', span: 'md:col-span-2 lg:col-span-2' },
  { Icon: ClipboardList, accent: 'var(--success)', span: 'md:col-span-2 lg:col-span-2' },
  { Icon: LayoutDashboard, accent: 'var(--accent)', span: 'md:col-span-2 lg:col-span-1' },
  { Icon: CalendarRange, accent: 'var(--warning)', span: 'md:col-span-2 lg:col-span-1' },
  { Icon: MessagesSquare, accent: 'var(--primary)', span: 'md:col-span-2 lg:col-span-2' },
  { Icon: Palette, accent: 'var(--accent)', span: 'md:col-span-2 lg:col-span-2' },
  { Icon: BellRing, accent: 'var(--warning)', span: 'md:col-span-4 lg:col-span-2' },
] as const;

const SESSION_ROWS = [0, 1, 2] as const;

/** First row is the live session; the rest are upcoming. */
const LIVE_ROW_INDEX = 0;

function PlatformCapabilitiesSection() {
  const t = useTranslations('PlatformCapabilitiesSection');
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Written straight to CSS vars instead of state: the spotlight follows the
  // cursor every frame and must not re-render seven tiles to do it.
  const trackSpotlight = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = gridRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    node.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      className="bg-muted/30 relative overflow-hidden py-20 md:py-28"
      aria-labelledby="capabilities-title">
      <div
        aria-hidden
        className="via-primary pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 15% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%), radial-gradient(ellipse 60% 50% at 90% 100%, color-mix(in oklch, var(--accent) 10%, transparent), transparent 70%)',
        }}
      />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="border-border bg-card/80 text-muted-foreground mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase shadow-sm backdrop-blur-sm">
            <ShieldCheck className="text-primary h-3.5 w-3.5" />
            {t('badge')}
          </span>
          <h2
            id="capabilities-title"
            className="from-foreground to-foreground/65 bg-linear-to-b bg-clip-text text-3xl font-bold text-balance text-transparent md:text-5xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-5 text-base text-pretty md:text-lg">
            {t('description')}
          </p>
        </div>

        <div
          ref={gridRef}
          onPointerMove={trackSpotlight}
          className="group/grid relative grid auto-rows-auto gap-4 md:grid-cols-4"
          style={{ '--spot-x': '50%', '--spot-y': '0%' } as React.CSSProperties}>
          {/* Cursor spotlight — sits behind the translucent tiles so it glows through them. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/grid:opacity-100"
            style={{
              background:
                'radial-gradient(460px circle at var(--spot-x) var(--spot-y), color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)',
            }}
          />

          {/* Hero tile — private 1:1 sessions */}
          <div
            className={cn(
              'group border-primary/20 bg-card/70 relative z-10 col-span-full overflow-hidden rounded-3xl border p-7 shadow-lg backdrop-blur-sm transition-all duration-700 ease-out md:col-span-4 lg:col-span-2 lg:row-span-2',
              isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            )}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklch, var(--primary) 12%, transparent), transparent 55%)',
              }}
            />
            <div
              aria-hidden
              className="bg-primary/20 absolute -end-16 -top-16 h-52 w-52 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-70"
            />
            <BorderBeam duration={10} size={160} borderWidth={1.5} />

            <span className="bg-primary text-primary-foreground shadow-primary/30 relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110">
              <Video className="h-6 w-6" />
            </span>

            <h3 className="text-foreground relative mt-5 text-xl font-bold text-balance md:text-2xl">
              {t('privateSessions.title')}
            </h3>
            <p className="text-muted-foreground relative mt-3 text-sm leading-relaxed text-pretty md:text-base">
              {t('privateSessions.description')}
            </p>

            {/* Live 1:1 session moment */}
            <div className="border-border/70 bg-card/85 relative mt-7 rounded-2xl border p-4 shadow-sm backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                  {t('privateSessions.ledgerLabel')}
                </span>
                <span className="border-success/30 bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                    <span className="bg-success relative inline-flex h-1.5 w-1.5 rounded-full" />
                  </span>
                  {t('privateSessions.liveBadge')}
                </span>
              </div>

              <ul className="space-y-2.5">
                {SESSION_ROWS.map((index) => {
                  const isLive = index === LIVE_ROW_INDEX;
                  return (
                    <li
                      key={index}
                      className={cn(
                        'border-border/60 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ease-out',
                        isLive && 'border-success/35 bg-success/5',
                        isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      )}
                      style={{ transitionDelay: `${250 + index * 110}ms` }}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            isLive ? 'bg-success' : 'bg-muted-foreground/40'
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-xs font-semibold">
                            {t(`privateSessions.rows.${index}.student`)}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {t(`privateSessions.rows.${index}.slot`)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-bold',
                          isLive ? 'text-success' : 'text-muted-foreground'
                        )}>
                        {t(`privateSessions.rows.${index}.status`)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="border-border/70 mt-4 flex items-end justify-between gap-4 border-t pt-4">
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium">
                    {t('privateSessions.totalLabel')}
                  </p>
                  <p className="text-foreground mt-0.5 text-lg font-bold tabular-nums">
                    {t('privateSessions.totalValue')}
                  </p>
                </div>

                <div
                  aria-hidden
                  className="bg-muted relative h-2 w-28 overflow-hidden rounded-full">
                  <span
                    className="from-success/70 to-success absolute inset-y-0 start-0 rounded-full bg-linear-to-r transition-[width] duration-1000 ease-out"
                    style={{ width: isRevealed ? '62%' : '0%' }}
                  />
                </div>
              </div>
            </div>

            <p className="border-primary/40 text-muted-foreground relative mt-5 border-s-2 ps-3 text-xs leading-relaxed">
              <span className="text-foreground font-semibold">{t('whyLabel')}</span>{' '}
              {t('privateSessions.whyItMatters')}
            </p>
          </div>

          {/* Remaining capability tiles */}
          {CAPABILITIES.map(({ Icon, accent, span }, index) => (
            <div
              key={t(`items.${index}.title`)}
              style={
                {
                  '--tile': accent,
                  transitionDelay: `${150 + index * 70}ms`,
                } as React.CSSProperties
              }
              className={cn(
                'group border-border bg-card/70 relative z-10 overflow-hidden rounded-3xl border p-6 shadow-sm backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-[color-mix(in_oklch,var(--tile)_45%,transparent)] hover:shadow-xl',
                isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                span
              )}>
              {/* Accent rail that draws itself across the top edge on hover. */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 w-0 transition-all duration-500 ease-out group-hover:w-full"
                style={{
                  background: 'linear-gradient(to right, transparent, var(--tile), transparent)',
                }}
              />
              {/* Corner bloom in the tile's own hue. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
                style={{ background: 'color-mix(in oklch, var(--tile) 45%, transparent)' }}
              />
              {/* Oversized number watermark. */}
              <span
                aria-hidden
                className="text-foreground/6 pointer-events-none absolute -end-1 -bottom-5 text-7xl font-black tabular-nums transition-transform duration-500 group-hover:scale-110">
                {t(`items.${index}.number`)}
              </span>

              <span
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                style={{
                  color: 'var(--tile)',
                  borderColor: 'color-mix(in oklch, var(--tile) 30%, transparent)',
                  background: 'color-mix(in oklch, var(--tile) 12%, transparent)',
                }}>
                <Icon className="h-5 w-5" />
              </span>

              <h3 className="text-foreground relative mt-4 text-base font-bold text-balance md:text-lg">
                {t(`items.${index}.title`)}
              </h3>
              <p className="text-muted-foreground relative mt-2 text-sm leading-relaxed text-pretty">
                {t(`items.${index}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PlatformCapabilitiesSection;
