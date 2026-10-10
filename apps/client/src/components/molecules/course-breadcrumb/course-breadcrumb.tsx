'use client';

import { Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/atoms/breadcrumb';
import { cn } from '@/lib/utils';
import type { CourseBreadcrumbProps } from './course-breadcrumb.types';

/**
 * Renders locale-aware links without Radix `Slot`/`asChild`.
 * `@radix-ui/react-slot` before 1.2.5 + React 19 can infinite-loop via unstable
 * composed refs (`Maximum update depth exceeded` / `setRef`).
 */
export function CourseBreadcrumb({ items, className }: CourseBreadcrumbProps) {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const SeparatorIcon = isRtl ? ChevronLeft : ChevronRight;

  if (items.length === 0) return null;

  return (
    <Breadcrumb className={cn('mb-4', className)}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const showLink = Boolean(item.href) && !isLast;

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator>
                  <SeparatorIcon
                    data-testid={isRtl ? 'breadcrumb-chevron-rtl' : 'breadcrumb-chevron-ltr'}
                  />
                </BreadcrumbSeparator>
              ) : null}

              <BreadcrumbItem>
                {showLink ? (
                  <Link
                    href={item.href!}
                    data-slot="breadcrumb-link"
                    className="hover:text-foreground max-w-[12rem] truncate transition-colors"
                    title={item.label}>
                    {item.label}
                  </Link>
                ) : isLast ? (
                  <BreadcrumbPage
                    role={undefined}
                    className="max-w-[12rem] truncate"
                    title={item.label}>
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <span
                    data-slot="breadcrumb-page"
                    className="text-muted-foreground max-w-[12rem] truncate"
                    title={item.label}>
                    {item.label}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
