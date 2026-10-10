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
import { Wallet, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Currency } from '@lms-organization/shared-types';
import { PriceWithCurrency } from '@/components/atoms/price-with-currency';

interface PaymentMethodSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectWallet: () => void;
  onSelectDirect: () => void;
  courseName: string;
  price: number;
  currency?: Currency;
  currentBalance: number;
  balanceCurrency?: Currency;
}

export const PaymentMethodSelectionDialog = React.memo<PaymentMethodSelectionDialogProps>(
  ({
    open,
    onClose,
    onSelectWallet,
    onSelectDirect,
    courseName,
    price,
    currency = Currency.DEFAULT,
    currentBalance,
    balanceCurrency = currency,
  }: PaymentMethodSelectionDialogProps) => {
    const t = useTranslations('PaymentMethodSelectionDialog');

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
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('price')}</span>
                <PriceWithCurrency
                  amount={price}
                  currency={currency}
                  className="text-sm font-bold"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('yourBalance')}</span>
                <PriceWithCurrency
                  amount={currentBalance}
                  currency={balanceCurrency}
                  className="text-sm font-medium text-green-600"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={onSelectWallet} className="w-full" variant="default">
              <Wallet className="mr-2 h-4 w-4" />
              {t('payWithWallet')}
            </Button>
            <Button onClick={onSelectDirect} variant="secondary" className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              {t('payWithCard')}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

PaymentMethodSelectionDialog.displayName = 'PaymentMethodSelectionDialog';

export default PaymentMethodSelectionDialog;
