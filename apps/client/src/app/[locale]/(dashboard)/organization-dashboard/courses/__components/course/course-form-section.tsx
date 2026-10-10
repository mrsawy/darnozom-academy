'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface CourseFormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function CourseFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: CourseFormSectionProps) {
  return (
    <section className={cn('bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6', className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h3>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
