'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import {
  usePlatformOptions,
  useUpsertPlatformOptions,
} from '@/lib/hooks/admin-options/use-admin-options.hook';
import { PlatformOptionsForm } from './__components/platform-options-form';
import type { PlatformOptionsFormValues } from './__components/platform-options.schema';

export default function PlatformOptionsPage() {
  const t = useTranslations('AdminPlatformOptions');
  const { data: options, isLoading, isError, refetch } = usePlatformOptions();
  const upsertAll = useUpsertPlatformOptions();

  const handleSubmit = useCallback(
    async (values: PlatformOptionsFormValues) => {
      const entries = (
        Object.entries(values) as [keyof PlatformOptionsFormValues, string | undefined][]
      )
        .filter(([, val]) => val !== undefined && val !== null)
        .map(([key, value]) => ({ key: String(key), value }));
      await upsertAll.mutateAsync(entries);
    },
    [upsertAll]
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-muted-foreground">{t('loadError')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : (
        <PlatformOptionsForm
          options={options ?? []}
          onSubmit={(values) => void handleSubmit(values)}
          isSubmitting={upsertAll.isPending}
        />
      )}
    </div>
  );
}
