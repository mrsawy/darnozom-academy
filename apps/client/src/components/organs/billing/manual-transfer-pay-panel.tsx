'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, PAYMENT_METHOD_MANUAL_TRANSFER } from '@darnozom/shared-types';
import { useAttachReceipt, useInitiatePayment } from '@/lib/hooks/billing/use-billing.hook';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import type { IPaymentMethodConfig } from '@/lib/types/billing/payment-method-config';

export interface ManualTransferPayPanelProps {
  config: IPaymentMethodConfig;
  amountMinor: number;
  currency: Currency;
  onSubmitted: () => void;
  /** When retrying a rejected payment, reuse its id instead of initiating a new one. */
  retryPaymentId?: string;
}

export function ManualTransferPayPanel({
  config,
  amountMinor,
  currency,
  onSubmitted,
  retryPaymentId,
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
          meta: { paymentMethodConfigId: config._id },
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
        {config.fields.map((field) => (
          <div key={field.key} className="text-sm">
            <span className="text-muted-foreground">{field.label}: </span>
            {field.type === 'IMAGE' && field.value ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-provided image, not optimized asset
              <img src={field.value} alt={field.label} className="mt-1 max-w-[160px] rounded-md border" />
            ) : field.type === 'LINK' && field.value ? (
              <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {field.value}
              </a>
            ) : (
              <span className="font-medium">{field.value}</span>
            )}
          </div>
        ))}
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
