'use client';

import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ROUTE_ORG_CATEGORIES,
  ROUTE_ORG_ALL_CATEGORIES,
} from '@/lib/data/constants/routes.constants';

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('CategoriesLayout');
  const pathname = usePathname();

  const tabs = [
    { label: t('myCategories'), href: ROUTE_ORG_CATEGORIES },
    { label: t('allCategories'), href: ROUTE_ORG_ALL_CATEGORIES },
  ];

  // Determine active tab: prefer the most specific matching URL to avoid
  // "/categories" matching child routes that belong to "/categories/all".
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
