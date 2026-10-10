'use client';

import { WalletIcon, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import { useState } from 'react';
import { AddFundsDialog } from './AddFundsDialog';
import { WithdrawDialog } from './WithdrawDialog/WithdrawDialog';
import { useTranslations } from 'next-intl';

interface WalletBalanceCardProps {
  balance: number;
  currency: string;
  isFrozen?: boolean;
  onTransactionComplete?: () => void;
}

export function WalletBalanceCard({
  balance,
  currency,
  isFrozen = false,
  onTransactionComplete,
}: WalletBalanceCardProps) {
  const t = useTranslations('Wallet.balanceCard');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const handleTransactionSuccess = () => {
    setShowAddFunds(false);
    setShowWithdraw(false);
    onTransactionComplete?.();
  };

  return (
    <>
      <Card className="from-primary to-primary/80 text-primary-foreground border-0 bg-gradient-to-l dark:bg-gradient-to-br">
        <CardContent className="pt-6">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-primary-foreground/80 mb-2">{t('availableBalance')}</p>
              <h2 className="text-5xl font-bold">{balance.toFixed(2)}</h2>
              <p className="text-primary-foreground/60 mt-2">{currency}</p>
              {isFrozen ? (
                <p className="mt-2 text-sm font-semibold text-yellow-300">{t('walletFrozen')}</p>
              ) : null}
            </div>
            <WalletIcon className="text-primary-foreground/20 h-12 w-12" />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowAddFunds(true)}
              disabled={isFrozen}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addFunds')}
            </Button>
            <Button
              variant="outline"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 flex-1 border-4 bg-transparent"
              onClick={() => setShowWithdraw(true)}
              disabled={isFrozen}>
              {t('withdraw')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddFundsDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        currency={currency}
        onSuccess={handleTransactionSuccess}
      />

      <WithdrawDialog
        open={showWithdraw}
        onOpenChange={setShowWithdraw}
        currency={currency}
        currentBalance={balance}
        onSuccess={handleTransactionSuccess}
      />
    </>
  );
}
