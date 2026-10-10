'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Transaction } from '@/lib/types/transaction/ITransaction.interface';

import { WalletIcon } from 'lucide-react';
import { TransactionItem } from './TransactionItem';
import { useTranslations } from 'next-intl';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const t = useTranslations('Wallet.transactionList');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>

        {transactions.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">
            <WalletIcon className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>{t('noTransactions')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
