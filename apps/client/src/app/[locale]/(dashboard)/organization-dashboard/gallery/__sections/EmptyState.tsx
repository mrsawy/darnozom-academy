'use client';

import { IconPhoto } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

export function EmptyState() {
  const t = useTranslations('EmptyState');
  return (
    <div className="text-muted-foreground py-20 text-center">
      <div className="bg-muted mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full">
        <IconPhoto className="text-muted-foreground/50 h-8 w-8" />
      </div>
      <p className="text-lg font-medium">{t('noItemsYet')}</p>
      <p>{t('uploadToGetStarted')}</p>
    </div>
  );
}
