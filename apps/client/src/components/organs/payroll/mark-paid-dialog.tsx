'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { useMarkPayStatementPaid } from '@/lib/hooks/payroll/use-payroll.hook';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { IPayStatement } from '@/lib/types/payroll/payroll';

export interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: IPayStatement | null;
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  statement,
}: MarkPaidDialogProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();
  const markPaid = useMarkPayStatementPaid();

  const [paymentReference, setPaymentReference] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement) return;

    await markPaid.mutateAsync({
      id: statement._id,
      paymentReference: paymentReference.trim() || undefined,
    });

    setPaymentReference('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('markPaid')}</DialogTitle>
        </DialogHeader>

        {statement && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('teacher')}:</span>
                <span className="font-mono font-medium">{statement.teacherId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('month')}:</span>
                <span className="font-medium">{statement.month}</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-medium">{t('total')}:</span>
                <span className="font-bold text-primary">
                  {formatPayrollAmount(
                    statement.total,
                    statement.profileSnapshot.currency,
                    locale
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentReference">{t('paymentReference')}</Label>
              <Input
                id="paymentReference"
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={t('paymentReferencePlaceholder')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={markPaid.isPending}>
                {t('markPaid')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
