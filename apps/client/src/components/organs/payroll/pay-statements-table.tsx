'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { Fragment, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Currency, GroupPayModel, PayStatementStatus } from '@darnozom/shared-types';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { IBonusItem, IPayStatement, IPayStatementLine } from '@/lib/types/payroll/payroll';

export interface PayStatementsTableProps {
  statements: IPayStatement[];
  isLoading?: boolean;
  onAddBonus?: (statement: IPayStatement) => void;
  onApprove?: (statementId: string) => void;
  onMarkPaid?: (statement: IPayStatement) => void;
  isInstructorView?: boolean;
  /** Teacher display names by id; the id itself is shown when a name is unknown. */
  teacherNames?: Record<string, string>;
}

export function PayStatementsTable({
  statements,
  isLoading,
  onAddBonus,
  onApprove,
  onMarkPaid,
  isInstructorView = false,
  teacherNames,
}: PayStatementsTableProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const [selectedBonuses, setSelectedBonuses] = useState<{
    teacherId: string;
    month: string;
    currency: Currency;
    bonuses: IBonusItem[];
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <LoadingState />
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('emptyStatements')}</p>
      </div>
    );
  }

  const getStatusBadge = (status: PayStatementStatus) => {
    switch (status) {
      case PayStatementStatus.DRAFT:
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
            {t(`statuses.${status}`)}
          </Badge>
        );
      case PayStatementStatus.APPROVED:
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
            {t(`statuses.${status}`)}
          </Badge>
        );
      case PayStatementStatus.PAID:
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
            {t(`statuses.${status}`)}
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {!isInstructorView && <TableHead>{t('teacher')}</TableHead>}
              <TableHead>{t('month')}</TableHead>
              <TableHead>{t('groups')}</TableHead>
              <TableHead>{t('baseAmount')}</TableHead>
              <TableHead>{t('bonuses')}</TableHead>
              <TableHead>{t('total')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              {!isInstructorView && <TableHead className="text-end">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {statements.map((s) => {
              const currency = s.currency ?? s.profileSnapshot?.currency ?? Currency.SAR;
              const lines = s.lines ?? [];
              const isOpen = expanded.has(s._id);
              const bonusTotal = s.bonuses.reduce((acc, b) => acc + b.amount, 0);

              return (
                <Fragment key={s._id}>
                <TableRow>
                  {!isInstructorView && (
                    <TableCell className="text-sm font-medium">
                      {teacherNames?.[s.teacherId] ?? s.teacherId}
                    </TableCell>
                  )}
                  <TableCell className="font-medium whitespace-nowrap">
                    {s.month}
                  </TableCell>
                  <TableCell>
                    {lines.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggle(s._id)}
                        aria-expanded={isOpen}
                        className="text-primary text-xs underline underline-offset-2 hover:opacity-80">
                        {t('groupsCount', { count: lines.length })} ·{' '}
                        {isOpen ? t('hideBreakdown') : t('showBreakdown')}
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">{t('legacyStatement')}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatPayrollAmount(s.baseAmount, currency, locale)}
                  </TableCell>
                  <TableCell>
                    {s.bonuses.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBonuses({
                            teacherId: teacherNames?.[s.teacherId] ?? s.teacherId,
                            month: s.month,
                            currency,
                            bonuses: s.bonuses,
                          })
                        }
                        className="font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        +{formatPayrollAmount(bonusTotal, currency, locale)} ({s.bonuses.length})
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                    {formatPayrollAmount(s.total, currency, locale)}
                  </TableCell>
                  <TableCell>{getStatusBadge(s.status)}</TableCell>

                  {!isInstructorView && (
                    <TableCell className="text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {s.status === PayStatementStatus.DRAFT && (
                          <>
                            {onAddBonus && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddBonus(s)}
                              >
                                {t('addBonus')}
                              </Button>
                            )}
                            {onApprove && (
                              <Button
                                size="sm"
                                onClick={() => onApprove(s._id)}
                              >
                                {t('approve')}
                              </Button>
                            )}
                          </>
                        )}

                        {s.status === PayStatementStatus.APPROVED && onMarkPaid && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => onMarkPaid(s)}
                          >
                            {t('markPaid')}
                          </Button>
                        )}

                        {s.status === PayStatementStatus.PAID && s.paymentReference && (
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={s.paymentReference}
                          >
                            Ref: {s.paymentReference}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
                {isOpen && lines.length > 0 ? (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={isInstructorView ? 6 : 8} className="p-0">
                      <StatementLines lines={lines} locale={locale} />
                    </TableCell>
                  </TableRow>
                ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(selectedBonuses)}
        onOpenChange={(open) => !open && setSelectedBonuses(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('bonuses')}</DialogTitle>
          </DialogHeader>
          {selectedBonuses && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {t('teacher')}: {selectedBonuses.teacherId} | {t('month')}: {selectedBonuses.month}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedBonuses.bonuses.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center rounded border p-2 text-sm bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">{b.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.addedAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">
                      +{formatPayrollAmount(b.amount, selectedBonuses.currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatementLines({ lines, locale }: { lines: IPayStatementLine[]; locale: string }) {
  const t = useTranslations('Payroll');
  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th className="py-1 text-start font-medium">{t('group')}</th>
            <th className="py-1 text-start font-medium">{t('rule')}</th>
            <th className="py-1 text-start font-medium">{t('subscriptions')}</th>
            <th className="py-1 text-start font-medium">{t('collected')}</th>
            <th className="py-1 text-end font-medium">{t('teacherCost')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.groupId} className="border-t">
              <td className="py-1.5 font-medium">{line.groupName}</td>
              <td className="py-1.5 whitespace-nowrap">
                {line.model === GroupPayModel.PERCENT_OF_SUBSCRIPTIONS
                  ? t('ruleValue.PERCENT_OF_SUBSCRIPTIONS', { rate: line.rate })
                  : t(`ruleValue.${line.model}`, {
                      amount: formatPayrollAmount(line.rate, line.currency, locale),
                    })}
              </td>
              <td className="py-1.5">{line.subscriptions}</td>
              <td className="py-1.5 font-mono">
                {formatPayrollAmount(line.collected, line.currency, locale)}
              </td>
              <td className="py-1.5 text-end font-mono font-semibold">
                {formatPayrollAmount(line.amount, line.currency, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
