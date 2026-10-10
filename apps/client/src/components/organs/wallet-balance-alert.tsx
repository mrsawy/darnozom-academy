import { Alert, AlertDescription } from '@/components/atoms/alert';
import { PriceWithCurrency } from '@/components/atoms/price-with-currency';
import { Currency } from '@lms-organization/shared-types';
import { Wallet } from 'lucide-react';
import React from 'react';
import { useTranslations } from 'next-intl';

interface WalletBalanceAlertProps {
  balance: number;
  currency: Currency;
}

const WalletBalanceAlert = React.memo<WalletBalanceAlertProps>(
  ({ balance, currency }: WalletBalanceAlertProps) => {
    const t = useTranslations('Courses.singleCourse.enrollment');

    return (
      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{t('walletBalance')}:</span>
          <PriceWithCurrency amount={balance} currency={currency} className="font-bold" />
        </AlertDescription>
      </Alert>
    );
  }
);
WalletBalanceAlert.displayName = 'WalletBalanceAlert';

export default WalletBalanceAlert;
