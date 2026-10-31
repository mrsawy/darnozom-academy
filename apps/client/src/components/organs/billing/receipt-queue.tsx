'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/utils/billing/format-money';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';
import type { IFamilyPayment } from '@/lib/types/billing/billing';

export interface ReceiptQueueProps {
  payments: IFamilyPayment[];
  isLoading?: boolean;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
  onFilterChange?: (status: string) => void;
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
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!payment.receiptFileKey) {
      setReceiptUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const url = (await getFileUrl({ fileKey: payment.receiptFileKey! })) as string | undefined;
      if (!cancelled && typeof url === 'string') setReceiptUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [payment.receiptFileKey]);

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
            {payment.methodSnapshot?.label ?? payment.method}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {new Date(payment.createdAt).toLocaleString(locale)}
        </p>
        {payment.receiptFileKey && receiptUrl ? (
          <a
            href={receiptUrl}
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
  onFilterChange,
}: ReceiptQueueProps) {
  const t = useTranslations('Billing');

  const filter = onFilterChange ? (
    <div className="flex items-center gap-2">
      <label htmlFor="receipt-queue-status-filter" className="text-sm font-medium">
        {t('filterByStatus')}
      </label>
      <select
        id="receipt-queue-status-filter"
        aria-label="filterByStatus"
        onChange={(e) => onFilterChange(e.target.value)}
        className="bg-background rounded-md border px-3 py-1.5 text-sm">
        <option value="">{t('statusAll')}</option>
        <option value="PENDING_REVIEW">{t('status.UNDER_REVIEW')}</option>
        <option value="CONFIRMED">{t('status.PAID')}</option>
        <option value="REJECTED">{t('reject')}</option>
      </select>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {filter}
        <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
          {t('loading')}
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="space-y-3">
        {filter}
        <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
          {t('empty')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filter}
      {payments.map((payment) => (
        <ReceiptRow key={payment._id} payment={payment} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  );
}
