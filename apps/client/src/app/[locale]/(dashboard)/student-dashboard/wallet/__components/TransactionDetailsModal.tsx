'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Badge } from '@/components/atoms/badge';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@/lib/types/transaction/ITransaction.interface';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Info,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsModal({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailsModalProps) {
  const t = useTranslations('Wallet.transactionDetails');
  const tStatus = useTranslations('Wallet.transactionItem.status');
  if (!transaction) return null;

  const getTransactionIcon = () => {
    switch (transaction.type) {
      case TransactionType.CREDIT: {
        return <ArrowDownRight className="size-5" />;
      }
      case TransactionType.DEBIT: {
        return <ArrowUpRight className="size-5" />;
      }
      case TransactionType.TRANSFER: {
        return <ArrowLeftRight className="size-5" />;
      }
      default: {
        return <ArrowDownRight className="size-5" />;
      }
    }
  };

  const getTransactionColor = () => {
    switch (transaction.type) {
      case TransactionType.CREDIT: {
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      }
      case TransactionType.DEBIT: {
        return 'bg-destructive/10 text-destructive';
      }
      case TransactionType.TRANSFER: {
        return 'bg-primary/10 text-primary';
      }
      default: {
        return 'bg-muted text-muted-foreground';
      }
    }
  };

  const getStatusVariant = () => {
    switch (transaction.status) {
      case TransactionStatus.COMPLETED: {
        return 'default';
      }
      case TransactionStatus.FAILED: {
        return 'destructive';
      }
      case TransactionStatus.PENDING: {
        return 'secondary';
      }
      default: {
        return 'secondary';
      }
    }
  };

  const formatEnumValue = (value: string) => {
    // Try to get translation for transaction type first
    const typeKey = value.toLowerCase() as 'credit' | 'debit' | 'transfer';
    if (['credit', 'debit', 'transfer'].includes(typeKey)) {
      return t(`type.${typeKey}`);
    }
    // Fallback to formatted enum value
    return value
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  function DetailRow({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string | number | undefined;
    icon?: React.ComponentType<{ className?: string }>;
  }) {
    if (value === undefined || value === null || value === '') return null;

    return (
      <div className="border-border flex items-start justify-between border-b py-3 last:border-0">
        <div className="flex flex-1 items-center gap-2">
          {Icon ? <Icon className="text-muted-foreground size-4" /> : null}
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
        </div>
        <span className="text-foreground max-w-[60%] text-right text-sm break-words">
          {typeof value === 'number' ? value.toFixed(2) : String(value)}
        </span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${getTransactionColor()}`}>
              {getTransactionIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">{t('title')}</DialogTitle>
              <DialogDescription className="text-left">{transaction.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Status and Type */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant()}>{tStatus(transaction.status)}</Badge>
            <Badge variant="outline">{formatEnumValue(transaction.type)}</Badge>
            {transaction.purpose ? (
              <Badge variant="outline">{formatEnumValue(transaction.purpose)}</Badge>
            ) : null}
          </div>

          {/* Amount Section */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{t('amount')}</span>
              <span
                className={`text-2xl font-bold ${transaction.type === TransactionType.CREDIT ? 'text-green-600 dark:text-green-400' : transaction.type === TransactionType.DEBIT ? 'text-destructive' : 'text-primary'}`}>
                {transaction.type === TransactionType.CREDIT ? '+' : '-'}
                {transaction.amount.toFixed(2)} {transaction.currency}
              </span>
            </div>
          </div>

          {/* Transaction Information */}
          <div className="space-y-2">
            <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4" />
              {t('transactionInformation')}
            </h3>
            <div className="bg-card border-border rounded-lg border p-4">
              <DetailRow label={t('transactionId')} value={transaction.id} icon={FileText} />
              <DetailRow
                label={t('balanceBefore')}
                value={`${transaction.balanceBefore.toFixed(2)} ${transaction.currency}`}
                icon={DollarSign}
              />
              <DetailRow
                label={t('balanceAfter')}
                value={`${transaction.balanceAfter.toFixed(2)} ${transaction.currency}`}
                icon={DollarSign}
              />
              <DetailRow
                label={t('createdAt')}
                value={format(new Date(transaction.createdAt), 'PPpp')}
                icon={Calendar}
              />
            </div>
          </div>

          {/* Payment Information */}
          {transaction.paymentProvider ||
          transaction.paymentMethod ||
          transaction.externalTransactionId ? (
            <div className="space-y-2">
              <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="size-4" />
                {t('paymentInformation')}
              </h3>
              <div className="bg-card border-border rounded-lg border p-4">
                {transaction.paymentProvider ? (
                  <DetailRow
                    label={t('paymentProvider')}
                    value={formatEnumValue(transaction.paymentProvider)}
                  />
                ) : null}
                {transaction.paymentMethod ? (
                  <DetailRow
                    label={t('paymentMethod')}
                    value={formatEnumValue(transaction.paymentMethod)}
                  />
                ) : null}
                {transaction.externalTransactionId ? (
                  <DetailRow
                    label={t('externalTransactionId')}
                    value={transaction.externalTransactionId}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4" />
                {t('additionalInformation')}
              </h3>
              <div className="bg-card border-border rounded-lg border p-4">
                {Object.entries(transaction.metadata).map(([key, value]) => {
                  let stringValue: string;
                  if (value === null || value === undefined) {
                    stringValue = '';
                  } else if (typeof value === 'object') {
                    try {
                      stringValue = JSON.stringify(value, null, 2);
                    } catch {
                      stringValue = t('unableToDisplayValue');
                    }
                  } else if (
                    typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean'
                  ) {
                    stringValue = String(value);
                  } else {
                    stringValue = t('unableToDisplayValue');
                  }
                  return <DetailRow key={key} label={formatEnumValue(key)} value={stringValue} />;
                })}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
