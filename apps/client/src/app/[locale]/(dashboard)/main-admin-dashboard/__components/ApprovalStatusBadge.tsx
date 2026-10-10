'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  PENDING_UPDATE: 'outline',
};

export function ApprovalStatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useTranslations('AdminDashboard.approvalStatus');
  const variant = STATUS_VARIANTS[status] ?? 'secondary';
  const label = ['PENDING', 'APPROVED', 'REJECTED', 'PENDING_UPDATE'].includes(status)
    ? t(status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'PENDING_UPDATE')
    : status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
