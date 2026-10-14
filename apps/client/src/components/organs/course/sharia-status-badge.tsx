'use client';

import { useTranslations } from 'next-intl';
import { ShariaStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';

const VARIANT: Record<ShariaStatus, 'secondary' | 'default' | 'destructive'> = {
  [ShariaStatus.PENDING]: 'secondary',
  [ShariaStatus.APPROVED]: 'default',
  [ShariaStatus.REJECTED]: 'destructive',
};

export function ShariaStatusBadge({
  status,
  reviewComment,
}: {
  status: ShariaStatus;
  reviewComment: string | null;
}) {
  const t = useTranslations('Sharia');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={VARIANT[status]}>{t(`sharia.status.${status}`)}</Badge>
      {reviewComment ? (
        <span className="text-muted-foreground text-sm">{reviewComment}</span>
      ) : null}
    </div>
  );
}
