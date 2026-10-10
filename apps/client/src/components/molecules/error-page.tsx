'use client';

import { CircleAlert, Home, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Link } from '@/i18n/navigation';
import { ROUTE_HOME } from '@/lib/data/constants/routes.constants';
import { cn } from '@/lib/utils';

export interface ErrorPageProps {
  reset?: () => void;
  className?: string;
}

export function ErrorPage({ reset, className }: ErrorPageProps) {
  const t = useTranslations('ErrorPage');

  return (
    <div
      role="alert"
      className={cn(
        'bg-background relative flex min-h-[min(100vh,90rem)] w-full flex-col items-center justify-center overflow-hidden px-6 py-16',
        className
      )}>
      <div
        aria-hidden
        className="from-primary/10 via-background to-muted/40 pointer-events-none absolute inset-0 bg-linear-to-b"
      />
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-muted-foreground/10 pointer-events-none absolute -right-16 bottom-0 size-56 rounded-full blur-3xl"
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="border-border/80 bg-card text-destructive mb-6 flex size-16 items-center justify-center rounded-2xl border shadow-sm">
          <CircleAlert className="size-8" aria-hidden />
        </div>

        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed sm:text-base">
          {t('description')}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {reset ? (
            <Button type="button" onClick={reset} className="gap-2">
              <RotateCcw className="size-4" aria-hidden />
              {t('tryAgain')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" asChild className="gap-2">
            <Link href={ROUTE_HOME}>
              <Home className="size-4" aria-hidden />
              {t('goHome')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

ErrorPage.displayName = 'ErrorPage';
