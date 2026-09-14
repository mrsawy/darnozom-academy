'use client';

import { useTranslations } from 'next-intl';

export function SiteHeader() {
  const t = useTranslations('dashboard.header');
  return (
    <header className="flex h-14 items-center border-b px-6">
      <h2 className="text-sm font-medium text-muted-foreground">{t('title')}</h2>
    </header>
  );
}
