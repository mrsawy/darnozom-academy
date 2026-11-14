'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useLocale, useTranslations } from 'next-intl';
import { BillingSubscriptionStatus } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_BILLING_FAMILY } from '@/lib/data/constants/routes.constants';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { ISubscriptionOverviewRow } from '@/lib/types/billing/billing';

export function SubscriptionsTable({
  rows,
  isLoading,
}: {
  rows: ISubscriptionOverviewRow[];
  isLoading: boolean;
}) {
  const t = useTranslations('Accounting.subscriptions');
  const tBilling = useTranslations('Billing');
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <LoadingState />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.payer')}</TableHead>
            <TableHead>{t('columns.students')}</TableHead>
            <TableHead>{t('columns.groups')}</TableHead>
            <TableHead>{t('columns.type')}</TableHead>
            <TableHead>{t('columns.amount')}</TableHead>
            <TableHead>{t('columns.paid')}</TableHead>
            <TableHead>{t('columns.outstanding')}</TableHead>
            <TableHead>{t('columns.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isActive = row.status === BillingSubscriptionStatus.ACTIVE;
            return (
              <TableRow key={row._id}>
                <TableCell>
                  <Link
                    href={ROUTE_ORG_BILLING_FAMILY(row.familyId)}
                    title={t('openFamily')}
                    className="font-medium underline-offset-2 hover:underline">
                    {row.familyName}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {row.holderIsStudent ? t('payerStudent') : t('payerParent')}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {row.students.map((s) => s.name).join(', ')}
                </TableCell>
                <TableCell className="text-sm">
                  {row.groups.map((g) => g.name).join(', ')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {tBilling(`type.${row.type}`)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono whitespace-nowrap">
                  {row.amountMinor === 0
                    ? t('scholarship')
                    : formatMoney(row.amountMinor, row.currency, locale)}
                </TableCell>
                <TableCell className="font-mono whitespace-nowrap">
                  {formatMoney(row.paidMinor, row.currency, locale)}
                </TableCell>
                <TableCell className="font-mono whitespace-nowrap">
                  {row.outstandingMinor > 0 ? (
                    <span className="text-destructive font-semibold">
                      {formatMoney(row.outstandingMinor, row.currency, locale)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t('settled')}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                        : 'text-muted-foreground'
                    }>
                    {isActive ? tBilling('active') : tBilling('ended')}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
