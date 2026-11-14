'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useLocale, useTranslations } from 'next-intl';
import { GroupPayModel, PayStatementStatus, type Currency } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { IPayStatement } from '@/lib/types/payroll/payroll';

export interface GroupPayrollTableProps {
  statements: IPayStatement[];
  teacherNames?: Record<string, string>;
  isLoading?: boolean;
}

interface GroupRow {
  key: string;
  groupName: string;
  teacher: string;
  status: PayStatementStatus;
  model: GroupPayModel;
  rate: number;
  currency: Currency;
  subscriptions: number;
  collected: number;
  amount: number;
}

const STATUS_STYLE: Record<PayStatementStatus, string> = {
  [PayStatementStatus.DRAFT]: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  [PayStatementStatus.APPROVED]: 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  [PayStatementStatus.PAID]:
    'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
};

/**
 * The month seen group by group: what each group's teacher costs against what the group collected.
 * Built only from the statements' frozen lines, so it always agrees with the by-teacher view.
 */
export function GroupPayrollTable({ statements, teacherNames, isLoading }: GroupPayrollTableProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <LoadingState />
      </div>
    );
  }

  const rows: GroupRow[] = statements.flatMap((s) =>
    (s.lines ?? []).map((line) => ({
      key: `${s._id}:${line.groupId}`,
      groupName: line.groupName,
      teacher: teacherNames?.[s.teacherId] ?? s.teacherId,
      status: s.status,
      model: line.model,
      rate: line.rate,
      currency: line.currency,
      subscriptions: line.subscriptions,
      collected: line.collected,
      amount: line.amount,
    }))
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('emptyStatements')}</p>
      </div>
    );
  }

  const sorted = rows.toSorted((a, b) => a.groupName.localeCompare(b.groupName, locale));

  // Totals per currency: amounts in different currencies are never added together.
  const totals = new Map<Currency, { collected: number; amount: number }>();
  for (const row of rows) {
    const current = totals.get(row.currency) ?? { collected: 0, amount: 0 };
    current.collected += row.collected;
    current.amount += row.amount;
    totals.set(row.currency, current);
  }

  const share = (amount: number, collected: number) =>
    collected > 0 ? `${Math.round((amount / collected) * 100)}%` : '—';

  return (
    <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('group')}</TableHead>
            <TableHead>{t('teacher')}</TableHead>
            <TableHead>{t('rule')}</TableHead>
            <TableHead>{t('subscriptions')}</TableHead>
            <TableHead>{t('collected')}</TableHead>
            <TableHead>{t('teacherCost')}</TableHead>
            <TableHead>{t('shareOfCollected')}</TableHead>
            <TableHead>{t('status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium">{row.groupName}</TableCell>
              <TableCell>{row.teacher}</TableCell>
              <TableCell className="whitespace-nowrap">
                {row.model === GroupPayModel.PERCENT_OF_SUBSCRIPTIONS
                  ? t('ruleValue.PERCENT_OF_SUBSCRIPTIONS', { rate: row.rate })
                  : t(`ruleValue.${row.model}`, {
                      amount: formatPayrollAmount(row.rate, row.currency, locale),
                    })}
              </TableCell>
              <TableCell>{row.subscriptions}</TableCell>
              <TableCell className="font-mono">
                {formatPayrollAmount(row.collected, row.currency, locale)}
              </TableCell>
              <TableCell className="text-primary font-mono font-semibold whitespace-nowrap">
                {formatPayrollAmount(row.amount, row.currency, locale)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {share(row.amount, row.collected)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLE[row.status]}>
                  {t(`statuses.${row.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          {[...totals.entries()].map(([currency, total]) => (
            <TableRow key={currency}>
              <TableCell colSpan={4} className="font-semibold">
                {t('teacherTotal')} ({currency})
              </TableCell>
              <TableCell className="font-mono font-semibold">
                {formatPayrollAmount(total.collected, currency, locale)}
              </TableCell>
              <TableCell className="font-mono font-bold whitespace-nowrap">
                {formatPayrollAmount(total.amount, currency, locale)}
              </TableCell>
              <TableCell className="text-sm">{share(total.amount, total.collected)}</TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableFooter>
      </Table>
    </div>
  );
}
