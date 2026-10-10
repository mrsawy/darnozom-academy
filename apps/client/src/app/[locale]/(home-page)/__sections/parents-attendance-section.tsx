'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarCheck, CreditCard, HeartHandshake, LineChart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 4 weeks × 7 days of attendance: 2 = present, 1 = late, 0 = absent, -1 = no session. */
const ATTENDANCE_MATRIX = [
  [2, 2, -1, 2, 2, 1, -1],
  [2, 1, -1, 2, 2, 2, -1],
  [2, 2, -1, 0, 2, 2, -1],
  [2, 2, -1, 2, 2, 2, -1],
] as const;

const CELL_STYLES: Record<string, string> = {
  '2': 'bg-success',
  '1': 'bg-warning',
  '0': 'bg-destructive',
  '-1': 'bg-muted',
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
const ATTENDANCE_RATE = 92;

const TIME_ON_TASK = [
  { percent: 86, tone: 'bg-primary' },
  { percent: 64, tone: 'bg-accent' },
  { percent: 41, tone: 'bg-warning' },
] as const;

const BENEFIT_ICONS = [CalendarCheck, LineChart, CreditCard, HeartHandshake] as const;

function ParentsAttendanceSection() {
  const t = useTranslations('ParentsAttendanceSection');
  const sectionRef = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsRevealed(true);
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const benefits = BENEFIT_ICONS.map((Icon, index) => ({
    Icon,
    title: t(`benefits.${index}.title`),
    description: t(`benefits.${index}.description`),
  }));

  return (
    <section
      ref={sectionRef}
      id="parents"
      className="bg-background relative overflow-hidden py-20 md:py-28">
      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="border-success/25 bg-success/10 text-success mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('badge')}
          </span>
          <h2 className="text-foreground text-3xl font-bold text-balance md:text-5xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-5 text-base text-pretty md:text-lg">
            {t('description')}
          </p>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          {/* Mock parent dashboard */}
          <div className="border-border bg-card relative rounded-3xl border p-6 shadow-2xl md:p-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                  {t('dashboard.label')}
                </p>
                <p className="text-foreground mt-1 text-lg font-bold">{t('dashboard.childName')}</p>
              </div>
              <span className="bg-success/10 text-success rounded-full px-3 py-1.5 text-xs font-semibold">
                {t('dashboard.statusOnTrack')}
              </span>
            </div>

            <div className="grid gap-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              {/* Attendance ring */}
              <div className="relative mx-auto h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    className="stroke-muted"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="stroke-success transition-[stroke-dashoffset] duration-[1600ms] ease-out"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={
                      isRevealed
                        ? RING_CIRCUMFERENCE * (1 - ATTENDANCE_RATE / 100)
                        : RING_CIRCUMFERENCE
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-foreground text-3xl font-bold">
                    {t('dashboard.attendanceValue')}
                  </span>
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {t('dashboard.attendanceLabel')}
                  </span>
                </div>
              </div>

              {/* Time on task */}
              <div className="space-y-4">
                <p className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                  {t('dashboard.timeLabel')}
                </p>
                {TIME_ON_TASK.map((bar, index) => (
                  <div key={index}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">
                        {t(`dashboard.courses.${index}.name`)}
                      </span>
                      <span className="text-muted-foreground">
                        {t(`dashboard.courses.${index}.time`)}
                      </span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'h-full rounded-full transition-[width] duration-[1400ms] ease-out',
                          bar.tone
                        )}
                        style={{
                          width: isRevealed ? `${bar.percent}%` : '0%',
                          transitionDelay: `${index * 150}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance heatmap */}
            <div className="border-border/70 mt-8 border-t pt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                  {t('dashboard.heatmapLabel')}
                </p>
                <div className="flex items-center gap-3">
                  {['2', '1', '0'].map((state, index) => (
                    <span
                      key={state}
                      className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                      <span className={cn('h-2.5 w-2.5 rounded-[3px]', CELL_STYLES[state])} />
                      {t(`dashboard.legend.${index}`)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5" dir="ltr">
                {ATTENDANCE_MATRIX.flatMap((week, weekIndex) =>
                  week.map((state, dayIndex) => (
                    <span
                      key={`${weekIndex}-${dayIndex}`}
                      className={cn(
                        'aspect-square rounded-[5px] transition-all duration-500',
                        CELL_STYLES[String(state)],
                        state === -1 && 'opacity-50',
                        isRevealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                      )}
                      style={{ transitionDelay: `${(weekIndex * 7 + dayIndex) * 18}ms` }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <div className="space-y-6">
              {benefits.map(({ Icon, title, description }, index) => (
                <div key={title} className="group relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="bg-success/10 text-success flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </span>
                    {index < benefits.length - 1 ? (
                      <span aria-hidden className="bg-border mt-2 w-px flex-1" />
                    ) : null}
                  </div>
                  <div className="pb-1">
                    <p className="text-foreground text-base font-semibold">{title}</p>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-success/20 bg-success/5 mt-9 rounded-2xl border p-5">
              <p className="text-muted-foreground text-sm leading-relaxed">
                <span className="text-foreground font-semibold">{t('whyLabel')}</span>{' '}
                {t('whyItMatters')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ParentsAttendanceSection;
