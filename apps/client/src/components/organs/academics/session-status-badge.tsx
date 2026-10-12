'use client';

import { useTranslations } from 'next-intl';
import { SessionStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';

const VARIANT: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [SessionStatus.SCHEDULED]: 'secondary',
  [SessionStatus.REPORT_PENDING]: 'outline',
  [SessionStatus.COMPLETED]: 'default',
  [SessionStatus.CANCELLED]: 'destructive',
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const t = useTranslations('Academics');
  return <Badge variant={VARIANT[status]}>{t(`sessions.statuses.${status}`)}</Badge>;
}
