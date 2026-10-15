'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { useAddBonus } from '@/lib/hooks/payroll/use-payroll.hook';
import type { IPayStatement } from '@/lib/types/payroll/payroll';

export interface AddBonusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: IPayStatement | null;
}

export function AddBonusDialog({
  open,
  onOpenChange,
  statement,
}: AddBonusDialogProps) {
  const t = useTranslations('Payroll');
  const addBonus = useAddBonus();

  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement || amount <= 0 || !reason.trim()) return;

    await addBonus.mutateAsync({
      id: statement._id,
      amount,
      reason: reason.trim(),
    });

    setAmount(0);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('addBonus')}</DialogTitle>
        </DialogHeader>

        {statement && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="text-muted-foreground">{t('teacher')}: </span>
              <span className="font-mono font-medium">{statement.teacherId}</span>
              <span className="mx-2">|</span>
              <span className="text-muted-foreground">{t('month')}: </span>
              <span className="font-medium">{statement.month}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonusAmount">{t('bonusAmount')}</Label>
              <Input
                id="bonusAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonusReason">{t('bonusReason')}</Label>
              <Input
                id="bonusReason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('bonusReasonPlaceholder')}
                required
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
              <Button
                type="submit"
                disabled={addBonus.isPending || amount <= 0 || !reason.trim()}
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
