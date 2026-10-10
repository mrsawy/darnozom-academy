'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import type { EntityStatusType } from '@/lib/types/admin-review/admin-review.interface';

const variantMap: Record<EntityStatusType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  SUSPENDED: 'destructive',
  INACTIVE: 'secondary',
  DELETED: 'outline',
};

export function EntityStatusBadge({ status }: { status?: EntityStatusType }) {
  const t = useTranslations('AdminDashboard');
  if (!status) return null;
  return (
    <Badge variant={variantMap[status] ?? 'outline'}>
      {t(`entityStatus.${status.toLowerCase()}`)}
    </Badge>
  );
}
