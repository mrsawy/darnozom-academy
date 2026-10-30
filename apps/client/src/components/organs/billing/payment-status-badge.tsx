'use client';

import { useTranslations } from 'next-intl';

export type PaymentStatusBadgeValue = 'PAID' | 'UNPAID' | 'UNDER_REVIEW';

const STYLES: Record<PaymentStatusBadgeValue, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  UNPAID: 'bg-destructive/10 text-destructive',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatusBadgeValue }) {
  const t = useTranslations('Billing');

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {t(`status.${status}`)}
    </span>
  );
}
