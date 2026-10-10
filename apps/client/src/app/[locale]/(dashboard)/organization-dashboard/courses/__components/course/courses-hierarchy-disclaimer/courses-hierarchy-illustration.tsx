'use client';

import { BookOpen, ChevronRight, FolderOpen, Layers } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CoursesHierarchyIllustrationProps {
  className?: string;
  compact?: boolean;
}

const LEVELS = [
  {
    key: 'course' as const,
    Icon: BookOpen,
    accent: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    key: 'module' as const,
    Icon: FolderOpen,
    accent: 'bg-info/10 text-info border-info/20',
  },
  {
    key: 'content' as const,
    Icon: Layers,
    accent: 'bg-success/10 text-success border-success/20',
  },
];

export function CoursesHierarchyIllustration({
  className,
  compact = false,
}: CoursesHierarchyIllustrationProps) {
  const t = useTranslations('CoursesHierarchyDisclaimer');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <div
      className={cn(
        'flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-2',
        className
      )}
      dir={isRtl ? 'rtl' : 'ltr'}>
      {LEVELS.map((level, index) => {
        const Icon = level.Icon;
        return (
          <div key={level.key} className="flex flex-1 items-center gap-2 sm:contents">
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center rounded-xl border px-3 text-center',
                level.accent,
                compact ? 'gap-1 py-3' : 'gap-2 py-4'
              )}>
              <div className="bg-background/70 flex size-10 items-center justify-center rounded-full border">
                <Icon className="size-5" aria-hidden />
              </div>
              <p className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
                {t(`levels.${level.key}.title`)}
              </p>
              {compact ? null : (
                <p className="text-muted-foreground text-xs leading-snug">
                  {t(`levels.${level.key}.description`)}
                </p>
              )}
            </div>
            {index < LEVELS.length - 1 ? (
              <ChevronRight
                className={cn(
                  'text-muted-foreground mx-auto size-5 shrink-0 sm:mx-1',
                  isRtl && 'rotate-180'
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
