'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/atoms/badge';

export function StepHeader({
  step,
  icon,
  title,
  description,
  count,
  action,
}: {
  step: number;
  icon?: ReactNode;
  title: string;
  description?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary text-primary-foreground mt-px flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {step}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {icon ? <span className="text-muted-foreground">{icon}</span> : null}
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {typeof count === 'number' ? <Badge variant="secondary">{count}</Badge> : null}
          </div>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
