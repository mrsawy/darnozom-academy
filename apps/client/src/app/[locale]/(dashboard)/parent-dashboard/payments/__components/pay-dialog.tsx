'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { parseMoney } from '@/lib/utils/billing/format-money';
import type { IPaymentMethodOption } from '@/lib/types/billing/billing';

export interface PayDialogProps {
  methods: IPaymentMethodOption[];
  onPay: (data: {
    method: string;
    amountMinor: number;
    currency: Currency;
    receiptFile?: File;
  }) => void;
  isSubmitting: boolean;
  onClose?: () => void;
}

export function PayDialog({ methods, onPay, isSubmitting, onClose }: PayDialogProps) {
  const t = useTranslations('Billing');
  const [selectedMethod, setSelectedMethod] = useState<string>(methods[0]?.key ?? '');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(Currency.EGP);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (methods.length === 0) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6 text-center">
        <p className="text-muted-foreground text-sm">{t('noMethods')}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted mt-4 rounded-md border px-4 py-2 text-sm font-medium">
            {t('cancel')}
          </button>
        ) : null}
      </div>
    );
  }

  const activeMethod = selectedMethod || methods[0]?.key;
  const isReceiptUpload = activeMethod === PAYMENT_METHOD_RECEIPT_UPLOAD;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedMinor = parseMoney(amount);
    if (parsedMinor === null) {
      setError(t('amountInvalid'));
      return;
    }

    onPay({
      method: activeMethod,
      amountMinor: parsedMinor,
      currency,
      receiptFile: receiptFile ?? undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card text-card-foreground space-y-4 rounded-lg border p-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-lg font-semibold">{t('payDialogTitle')}</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm">
            ✕
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('chooseMethod')}</label>
        <div className="space-y-2">
          {methods.map((m) => (
            <label
              key={m.key}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                activeMethod === m.key
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'hover:bg-muted/50'
              }`}>
              <input
                type="radio"
                name="payment-method"
                value={m.key}
                checked={activeMethod === m.key}
                onChange={() => setSelectedMethod(m.key)}
                aria-label={m.key}
                className="text-primary h-4 w-4"
              />
              <span>{t(`method.${m.key}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="payment-amount" className="text-sm font-medium">
            {t('amount')}
          </label>
          <input
            id="payment-amount"
            aria-label="amount"
            type="text"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError(null);
            }}
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="payment-currency" className="text-sm font-medium">
            {t('currency')}
          </label>
          <select
            id="payment-currency"
            aria-label="currency"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}>
            {[...new Set(Object.values(Currency))].map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isReceiptUpload ? (
        <div className="space-y-1">
          <label htmlFor="receipt-upload" className="text-sm font-medium">
            {t('uploadReceipt')}
          </label>
          <input
            id="receipt-upload"
            aria-label="receiptUpload"
            type="file"
            accept="image/*,application/pdf"
            className="bg-background file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 w-full rounded-md border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setReceiptFile(file);
            }}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium">
            {t('cancel')}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
          {t('pay')}
        </button>
      </div>
    </form>
  );
}
