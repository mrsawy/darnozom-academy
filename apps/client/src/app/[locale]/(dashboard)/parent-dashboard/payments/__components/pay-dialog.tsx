'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, PAYMENT_METHOD_MANUAL_TRANSFER, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { parseMoney } from '@/lib/utils/billing/format-money';
import type { IPaymentMethodOption } from '@/lib/types/billing/billing';
import type { IPaymentMethodConfig } from '@/lib/types/billing/payment-method-config';
import { ManualTransferPayPanel } from '@/components/organs/billing/manual-transfer-pay-panel';

export interface PayDialogProps {
  methods: IPaymentMethodOption[];
  paymentMethodConfigs?: IPaymentMethodConfig[];
  onPay: (data: {
    method: string;
    amountMinor: number;
    currency: Currency;
    receiptFile?: File;
  }) => void;
  isSubmitting: boolean;
  onClose?: () => void;
  onManualTransferSubmitted?: () => void;
}

type SelectableOption = { kind: 'METHOD'; key: string } | { kind: 'CONFIG'; config: IPaymentMethodConfig };

export function PayDialog({
  methods,
  paymentMethodConfigs = [],
  onPay,
  isSubmitting,
  onClose,
  onManualTransferSubmitted,
}: PayDialogProps) {
  const t = useTranslations('Billing');
  const enabledConfigs = paymentMethodConfigs.filter((c) => c.enabled);
  const hasManualTransfer = methods.some((m) => m.key === PAYMENT_METHOD_MANUAL_TRANSFER);
  const options: SelectableOption[] = [
    ...methods.filter((m) => m.key !== PAYMENT_METHOD_MANUAL_TRANSFER).map((m) => ({ kind: 'METHOD' as const, key: m.key })),
    ...(hasManualTransfer ? enabledConfigs.map((config) => ({ kind: 'CONFIG' as const, config })) : []),
  ];
  const optionKey = (option: SelectableOption) => (option.kind === 'METHOD' ? option.key : option.config._id);

  const [selectedKey, setSelectedKey] = useState<string>(options[0] ? optionKey(options[0]) : '');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(Currency.EGP);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
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

  const activeKey = selectedKey || optionKey(options[0]);
  const activeOption = options.find((o) => optionKey(o) === activeKey) ?? options[0];
  const isReceiptUpload = activeOption.kind === 'METHOD' && activeOption.key === PAYMENT_METHOD_RECEIPT_UPLOAD;
  const activeConfig = activeOption.kind === 'CONFIG' ? activeOption.config : null;

  const parsedAmountMinor = parseMoney(amount);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (parsedAmountMinor === null) {
      setError(t('amountInvalid'));
      return;
    }
    if (!(activeOption.kind === 'METHOD')) return;

    onPay({
      method: activeOption.key,
      amountMinor: parsedAmountMinor,
      currency,
      receiptFile: receiptFile ?? undefined,
    });
  };

  return (
    <div className="bg-card text-card-foreground space-y-4 rounded-lg border p-6">
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
          {options.map((option) => {
            const key = optionKey(option);
            const label = option.kind === 'METHOD' ? t(`method.${option.key}`) : option.config.label;
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                  activeKey === key ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/50'
                }`}>
                <input
                  type="radio"
                  name="payment-method"
                  value={key}
                  checked={activeKey === key}
                  onChange={() => setSelectedKey(key)}
                  aria-label={option.kind === 'METHOD' ? option.key : label}
                  className="text-primary h-4 w-4"
                />
                <span>{label}</span>
              </label>
            );
          })}
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

      {activeConfig ? (
        parsedAmountMinor !== null ? (
          <ManualTransferPayPanel
            config={activeConfig}
            amountMinor={parsedAmountMinor}
            currency={currency}
            onSubmitted={() => onManualTransferSubmitted?.()}
          />
        ) : (
          <p className="text-destructive text-xs">{t('amountInvalid')}</p>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
      )}
    </div>
  );
}
