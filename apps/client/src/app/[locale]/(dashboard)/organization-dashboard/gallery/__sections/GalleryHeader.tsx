'use client';

import { useTranslations } from 'next-intl';

interface GalleryHeaderProps {
  itemCount: number;
}

export function GalleryHeader({ itemCount }: GalleryHeaderProps) {
  const t = useTranslations('GalleryHeader');

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>
      <div className="text-muted-foreground text-sm">{t('itemsCount', { count: itemCount })}</div>
    </div>
  );
}
