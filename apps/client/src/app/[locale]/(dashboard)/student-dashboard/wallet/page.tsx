// app/student-dashboard/wallet/page.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { AlertCircle } from 'lucide-react';
import { TransactionListSkeleton, WalletBalanceSkeleton } from './__components/WalletSkeleton';
import { WalletHeader } from './__components/WalletHeader';
import { useWallet } from '@/lib/hooks/wallet/use-wallet';
import { WalletBalanceCard } from './__components/WalletBalanceCard';
import { TransactionList } from './__components/TransactionList';
import { WithdrawalRequestsList } from './__components/WithdrawalRequestsList/WithdrawalRequestsList';
import { useTranslations } from 'next-intl';

function WalletPage() {
  const { data: wallet, isLoading, error, refetch } = useWallet();
  const t = useTranslations('Wallet.page');

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <WalletHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <WalletBalanceSkeleton />
          </div>
          <TransactionListSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <WalletHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error.title')}</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : t('error.message')}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen">
        <WalletHeader />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('noWallet.title')}</AlertTitle>
            <AlertDescription>{t('noWallet.description')}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <WalletHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Balance Card */}
        <div className="mb-8">
          <WalletBalanceCard
            balance={wallet.balance}
            currency={wallet.currency}
            isFrozen={wallet.isFrozen}
            onTransactionComplete={() => {
              void refetch();
            }}
          />
        </div>

        {/* Transaction History */}
        <TransactionList transactions={wallet.transactionsHistory || []} />

        {/* Withdrawal Requests */}
        <div className="mt-8">
          <WithdrawalRequestsList />
        </div>
      </div>
    </div>
  );
}

export default WalletPage;
