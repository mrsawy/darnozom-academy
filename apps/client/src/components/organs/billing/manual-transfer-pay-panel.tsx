'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, PAYMENT_METHOD_MANUAL_TRANSFER } from '@darnozom/shared-types';
import { useAttachReceipt, useInitiatePayment } from '@/lib/hooks/billing/use-billing.hook';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import type { IPaymentMethodConfig } from '@/lib/types/billing/payment-method-config';

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const BUILT_IN_FIELD_KEYS = new Set(['transferNumber', 'accountName', 'qrCodeImage', 'instructions']);

export interface ManualTransferPayPanelProps {
  config: IPaymentMethodConfig;
  amountMinor: number;
  currency: Currency;
  onSubmitted: () => void;
  /** When retrying a rejected payment, reuse its id instead of initiating a new one. */
  retryPaymentId?: string;
  /** The subscription this payment settles, so approval allocates to its own charges only. */
  subscriptionId?: string;
}

export function ManualTransferPayPanel({
  config,
  amountMinor,
  currency,
  onSubmitted,
  retryPaymentId,
  subscriptionId,
}: ManualTransferPayPanelProps) {
  const t = useTranslations('Billing');
  const initiate = useInitiatePayment();
  const attach = useAttachReceipt();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      let paymentId = retryPaymentId;
      if (!paymentId) {
        const result = await initiate.mutateAsync({
          method: PAYMENT_METHOD_MANUAL_TRANSFER,
          amountMinor,
          currency,
          meta: { paymentMethodConfigId: config._id, ...(subscriptionId ? { subscriptionId } : {}) },
        });
        paymentId = (result as { paymentId: string }).paymentId;
      }
      const fileKey = await uploadFileToS3({ file });
      await attach.mutateAsync({ paymentId, fileKey });
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {config.fields
          .filter((field) => field.value?.trim())
          .map((field) => {
            const label = BUILT_IN_FIELD_KEYS.has(field.key) ? t(`field.${field.key}`) : field.label;
            return (
              <div key={field.key} className="text-sm">
                <span className="text-muted-foreground">{label}: </span>
                {field.type === 'IMAGE' && safeHref(field.value) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-provided image, not optimized asset
                  <img src={safeHref(field.value)!} alt={label} className="mt-1 max-w-[160px] rounded-md border" />
                ) : field.type === 'LINK' && safeHref(field.value) ? (
                  <a href={safeHref(field.value)!} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {field.value}
                  </a>
                ) : (
                  <span className="font-medium">{field.value}</span>
                )}
              </div>
            );
          })}
      </div>

      <div className="space-y-1">
        <label htmlFor="manual-transfer-upload" className="text-sm font-medium">
          {t('uploadReceipt')}
        </label>
        <input
          id="manual-transfer-upload"
          aria-label="uploadReceipt"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="bg-background file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 w-full rounded-md border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium"
        />
      </div>

      <button
        type="button"
        disabled={!file || isSubmitting || initiate.isPending || attach.isPending}
        onClick={handleSubmit}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
        {t('submitPayment')}
      </button>
    </div>
  );
}
