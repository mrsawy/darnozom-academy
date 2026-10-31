'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { IBillingSubscription, IOpenSubscriptionBalance } from '@/lib/types/billing/billing';

export interface OutstandingSubscriptionRow {
  balance: IOpenSubscriptionBalance;
  subscription?: IBillingSubscription;
  studentNames: string[];
}

export interface OutstandingSubscriptionsProps {
  rows: OutstandingSubscriptionRow[];
  onPay: (row: OutstandingSubscriptionRow) => void;
}

export function OutstandingSubscriptions({ rows, onPay }: OutstandingSubscriptionsProps) {
  const t = useTranslations('Billing');
  const locale = useLocale();

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-wider uppercase">{t('outstanding')}</h3>
        <p className="text-muted-foreground text-xs">{t('outstandingSubtitle')}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noOutstanding')}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const typeLabel = row.subscription ? t(`type.${row.subscription.type}`) : null;
            const who = row.studentNames.join(', ');
            return (
              <div
                key={row.balance.subscriptionId}
                data-testid="outstanding-row"
                className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{who || typeLabel}</p>
                  <p className="text-muted-foreground text-xs">
                    {[typeLabel, t('monthsPending', { count: row.balance.chargeCount })].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">
                    {formatMoney(row.balance.outstandingMinor, row.balance.currency, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPay(row)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium">
                    {t('pay')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
