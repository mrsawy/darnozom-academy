import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Separator } from '@/components/atoms/separator';
import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import React from 'react';

interface ConfirmEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmDirect?: () => void;
  courseName: string;
  pricingLabel: string;
  price: number;
  isPaid: boolean;
  currentBalance?: number;
}

export const ConfirmEnrollmentDialog = React.memo<ConfirmEnrollmentDialogProps>(
  ({
    open,
    onClose,
    onConfirm,
    onConfirmDirect,
    courseName,
    pricingLabel,
    price,
    isPaid,
    currentBalance = 0,
  }: ConfirmEnrollmentDialogProps) => {
    const t = useTranslations('ConfirmEnrollmentDialog');
    const canPayWithWallet = isPaid && currentBalance >= price;

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('course')}</span>
                <span className="text-sm font-medium">{courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('pricingPlan')}</span>
                <span className="text-sm font-medium">{pricingLabel}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('price')}</span>
                <span className="text-sm font-bold">
                  {isPaid ? `$${price.toFixed(2)}` : t('free')}
                </span>
              </div>
              {isPaid && canPayWithWallet ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{t('currentBalance')}</span>
                    <span className="text-sm">${currentBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">{t('balanceAfter')}</span>
                    <span className="text-sm font-medium">
                      ${(currentBalance - price).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : null}
              {isPaid && !canPayWithWallet ? (
                <div className="text-destructive flex justify-between">
                  <span className="text-sm">{t('insufficientBalance')}</span>
                  <span className="text-sm">${currentBalance.toFixed(2)}</span>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {isPaid ? (
              <>
                {canPayWithWallet ? (
                  <Button onClick={onConfirm} className="w-full">
                    {t('payWithWallet')}
                  </Button>
                ) : null}
                {onConfirmDirect ? (
                  <Button onClick={onConfirmDirect} variant="secondary" className="w-full">
                    {t('payWithCard')}
                  </Button>
                ) : null}
              </>
            ) : (
              <Button onClick={onConfirm} className="w-full">
                {t('enrollForFree')}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="w-full">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export default ConfirmEnrollmentDialog;
