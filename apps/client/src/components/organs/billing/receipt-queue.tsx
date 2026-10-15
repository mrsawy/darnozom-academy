'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { IFamilyPayment } from '@/lib/types/billing/billing';

export interface ReceiptQueueProps {
  payments: IFamilyPayment[];
  isLoading?: boolean;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
}

function ReceiptRow({
  payment,
  onApprove,
  onReject,
}: {
  payment: IFamilyPayment;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
}) {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleReject = () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setError(t('reasonRequired'));
      return;
    }
    setError(null);
    onReject(payment._id, trimmed);
  };

  return (
    <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold">
            {formatMoney(payment.amountMinor, payment.currency, locale)}
          </span>
          <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
            {payment.method}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {new Date(payment.createdAt).toLocaleString(locale)}
        </p>
        {payment.receiptFileKey ? (
          <a
            href={`/api/files/${payment.receiptFileKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center text-xs font-medium underline underline-offset-2 hover:opacity-80">
            {t('receipt')}
          </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 md:items-end">
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="rejectReason"
            placeholder={t('rejectReasonPlaceholder')}
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (error) setError(null);
            }}
            className="bg-background rounded-md border px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleReject}
            className="border-destructive text-destructive hover:bg-destructive/10 inline-flex items-center rounded-md border bg-transparent px-3 py-1.5 text-sm font-medium">
            {t('reject')}
          </button>
          <button
            type="button"
            onClick={() => onApprove(payment._id)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium">
            {t('approve')}
          </button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </div>
  );
}

export function ReceiptQueue({
  payments,
  isLoading = false,
  onApprove,
  onReject,
}: ReceiptQueueProps) {
  const t = useTranslations('Billing');

  if (isLoading) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
        {t('loading')}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <ReceiptRow key={payment._id} payment={payment} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  );
}
