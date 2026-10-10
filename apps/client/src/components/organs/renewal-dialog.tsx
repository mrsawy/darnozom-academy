'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import { Label } from '@/components/atoms/label';
import { Wallet, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';

interface RenewalDialogProps {
  open: boolean;
  onClose: () => void;
  onRenew: (billingCycle: BillingCycle, paymentMethod: 'WALLET' | 'DIRECT') => void;
  courseName: string;
  isLoading?: boolean;
}

export function RenewalDialog({
  open,
  onClose,
  onRenew,
  courseName,
  isLoading = false,
}: RenewalDialogProps) {
  const t = useTranslations('StudentCourses.renewalModal');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(BillingCycle.MONTHLY);

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm font-medium">{courseName}</p>

          <RadioGroup
            value={selectedCycle}
            onValueChange={(val) => setSelectedCycle(val as BillingCycle)}
            className="space-y-2">
            <div
              role="button"
              tabIndex={0}
              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
              onClick={() => setSelectedCycle(BillingCycle.MONTHLY)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCycle(BillingCycle.MONTHLY);
                }
              }}>
              <RadioGroupItem value={BillingCycle.MONTHLY} id="renewal-monthly" />
              <Label htmlFor="renewal-monthly" className="flex-1 cursor-pointer font-medium">
                {t('monthly')}
              </Label>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
              onClick={() => setSelectedCycle(BillingCycle.YEARLY)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCycle(BillingCycle.YEARLY);
                }
              }}>
              <RadioGroupItem value={BillingCycle.YEARLY} id="renewal-yearly" />
              <Label htmlFor="renewal-yearly" className="flex-1 cursor-pointer font-medium">
                {t('yearly')}
              </Label>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
              onClick={() => setSelectedCycle(BillingCycle.ONE_TIME)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCycle(BillingCycle.ONE_TIME);
                }
              }}>
              <RadioGroupItem value={BillingCycle.ONE_TIME} id="renewal-onetime" />
              <Label htmlFor="renewal-onetime" className="flex-1 cursor-pointer font-medium">
                {t('oneTime')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => onRenew(selectedCycle, 'WALLET')}
            className="w-full"
            disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {isLoading ? t('renewing') : t('payWithWallet')}
          </Button>
          <Button
            onClick={() => onRenew(selectedCycle, 'DIRECT')}
            variant="secondary"
            className="w-full"
            disabled={isLoading}>
            <CreditCard className="mr-2 h-4 w-4" />
            {t('payDirect')}
          </Button>
          <Button variant="ghost" onClick={handleClose} className="w-full" disabled={isLoading}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
