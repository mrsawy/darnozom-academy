'use client';

import { Button } from '@/components/atoms/button';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CourseContentSidebarErrorProps {
  /** e.g. pass React Query `refetch` from `useDetailedEnrolledCourse` */
  onRetry?: () => void;
  /** Optional detail under the title (for example `error.message`). */
  detail?: string;
}

export default function CourseContentSidebarError({
  onRetry,
  detail,
}: CourseContentSidebarErrorProps) {
  const t = useTranslations('StudentCourses.contentView');

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 px-4 py-8 text-center"
      role="alert"
      aria-live="polite">
      <AlertCircle className="text-destructive h-10 w-10 shrink-0 opacity-90" aria-hidden />
      <div className="max-w-[220px] space-y-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {t('failedToLoad')}
        </p>
        {detail ? (
          <p className="text-muted-foreground line-clamp-4 text-xs wrap-break-word">{detail}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      ) : null}
    </div>
  );
}
