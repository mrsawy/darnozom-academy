'use client';

import { Button } from '@/components/atoms/button';
import { IconUserPlus } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface ChildrenPageHeaderProps {
  onAddChild: () => void;
}

export function ChildrenPageHeader({ onAddChild }: ChildrenPageHeaderProps) {
  const t = useTranslations('ParentDashboard.children');

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>
      <Button onClick={onAddChild}>
        <IconUserPlus className="mr-2 h-4 w-4" />
        {t('addChild')}
      </Button>
    </div>
  );
}
