'use client';

import { useState } from 'react';
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
import { PayStatementStatus, TeacherPayModel } from '@darnozom/shared-types';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { IBonusItem, IPayStatement } from '@/lib/types/payroll/payroll';

export interface PayStatementsTableProps {
  statements: IPayStatement[];
  isLoading?: boolean;
  onAddBonus?: (statement: IPayStatement) => void;
  onApprove?: (statementId: string) => void;
  onMarkPaid?: (statement: IPayStatement) => void;
  isInstructorView?: boolean;
}

export function PayStatementsTable({
  statements,
  isLoading,
  onAddBonus,
  onApprove,
  onMarkPaid,
  isInstructorView = false,
}: PayStatementsTableProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();

  const [selectedBonuses, setSelectedBonuses] = useState<{
    teacherId: string;
    month: string;
    currency: Currency;
    bonuses: IBonusItem[];
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
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
              <TableHead>{t('payModel')}</TableHead>
              <TableHead>{t('basis')}</TableHead>
              <TableHead>{t('baseAmount')}</TableHead>
              <TableHead>{t('bonuses')}</TableHead>
              <TableHead>{t('total')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              {!isInstructorView && <TableHead className="text-end">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {statements.map((s) => {
              const currency = s.profileSnapshot.currency;
              const isRevShare = s.profileSnapshot.model === TeacherPayModel.REVENUE_SHARE;
              const formattedRate = isRevShare
                ? `${s.profileSnapshot.rate}%`
                : formatPayrollAmount(s.profileSnapshot.rate, currency, locale);

              const bonusTotal = s.bonuses.reduce((acc, b) => acc + b.amount, 0);

              return (
                <TableRow key={s._id}>
                  {!isInstructorView && (
                    <TableCell className="font-mono text-sm">
                      {s.teacherId}
                    </TableCell>
                  )}
                  <TableCell className="font-medium whitespace-nowrap">
                    {s.month}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs">
                        {t(`models.${s.profileSnapshot.model}`)}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {t('rate')}: {formattedRate}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    <div>{t('sessionsCount', { count: s.basis.sessions })}</div>
                    <div>{t('minutesCount', { count: s.basis.minutes })}</div>
                    {s.basis.students > 0 && (
                      <div>{t('studentsCount', { count: s.basis.students })}</div>
                    )}
                    {isRevShare && s.basis.revenue > 0 && (
                      <div className="font-medium text-foreground">
                        Rev: {formatPayrollAmount(s.basis.revenue, currency, locale)}
                      </div>
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
                            teacherId: s.teacherId,
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
