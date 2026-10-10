'use client';

import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ROUTE_MAIN_ADMIN_COURSES,
  ROUTE_MAIN_ADMIN_COURSES_REVIEW,
} from '@/lib/data/constants/routes.constants';

export default function AdminCoursesLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AdminCoursesLayout');
  const pathname = usePathname();

  const tabs = [
    { label: t('allCourses'), href: ROUTE_MAIN_ADMIN_COURSES },
    { label: t('toBeReviewed'), href: ROUTE_MAIN_ADMIN_COURSES_REVIEW },
  ];

  const activeHref = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))
    .toSorted((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <div className="mb-6 flex gap-1 rounded-lg border p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors',
              activeHref === tab.href
                ? 'bg-primary text-muted'
                : 'hover:bg-muted text-muted-foreground'
            )}>
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
