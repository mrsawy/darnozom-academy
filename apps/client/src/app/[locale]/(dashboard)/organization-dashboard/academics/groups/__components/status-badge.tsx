'use client';

import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';

const VARIANT: Record<GroupStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [GroupStatus.FORMING]: 'secondary',
  [GroupStatus.READY_TO_START]: 'default',
  [GroupStatus.RUNNING]: 'default',
  [GroupStatus.COMPLETED]: 'secondary',
  [GroupStatus.CANCELLED]: 'destructive',
};

export function StatusBadge({ status }: { status: GroupStatus }) {
  const t = useTranslations('Academics');
  return <Badge variant={VARIANT[status]}>{t(`groups.statuses.${status}`)}</Badge>;
}
