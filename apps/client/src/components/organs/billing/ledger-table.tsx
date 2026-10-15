'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LedgerEntryType } from '@darnozom/shared-types';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { ILedgerBalance, ILedgerEntry } from '@/lib/types/billing/billing';

export interface LedgerTableProps {
  entries: ILedgerEntry[];
  balances: ILedgerBalance[];
  isLoading?: boolean;
}

export function LedgerTable({ entries, balances, isLoading = false }: LedgerTableProps) {
  const t = useTranslations('Billing');
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
        {t('loading')}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {balances.length > 0 && (
        <div className="bg-card text-card-foreground rounded-lg border p-4">
          <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
            {t('balance')}
          </h3>
          <div className="space-y-2">
            {balances.map((b) => (
              <div
                key={b.currency}
                data-testid="balance-row"
                className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                <span className="font-medium">{b.currency}</span>
                {b.balanceMinor === 0 ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {t('settled')}
                  </span>
                ) : (
                  <span
                    className={`font-mono font-semibold ${b.balanceMinor > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {formatMoney(b.balanceMinor, b.currency, locale)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
            <tr>
              <th className="px-4 py-3">{t('date')}</th>
              <th className="px-4 py-3">{t('typeLabel')}</th>
              <th className="px-4 py-3">{t('description')}</th>
              <th className="px-4 py-3 text-right">{t('amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => {
              const isCharge = entry.type === LedgerEntryType.CHARGE;
              const isPayment = entry.type === LedgerEntryType.PAYMENT;
              const sign = entry.direction === 1 ? '+' : '-';
              const rawKey = entry.description.startsWith('billing.')
                ? entry.description.slice('billing.'.length)
                : entry.description;
              const descriptionText = rawKey.includes('.') ? t(rawKey) : entry.description;

              return (
                <tr key={entry._id} className="hover:bg-muted/30">
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {new Date(entry.createdAt).toLocaleDateString(locale)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid="entry-type-badge"
                      className={
                        isCharge
                          ? 'inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                          : isPayment
                            ? 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                      }>
                      {t(`entry.${entry.type.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{descriptionText}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-medium ${
                      isCharge ? 'text-foreground' : 'text-emerald-600'
                    }`}>
                    {sign}
                    {formatMoney(entry.amountMinor, entry.currency, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
