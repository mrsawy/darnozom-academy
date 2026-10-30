'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useUserStore from '@/lib/store/userStore';
import {
  useAttachReceipt,
  useInitiatePayment,
  useMethods,
  useMyFamilyPayments,
  usePaymentMethodConfigs,
  useStatement,
} from '@/lib/hooks/billing/use-billing.hook';
import { LedgerTable } from '@/components/organs/billing/ledger-table';
import { ManualTransferPayPanel } from '@/components/organs/billing/manual-transfer-pay-panel';
import { PayDialog } from './__components/pay-dialog';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';

export default function ParentPaymentsPage() {
  const t = useTranslations('Billing');
  const user = useUserStore((s) => s.user);
  const myFamilyId = user?._id ?? '';

  const { data: statement, isLoading } = useStatement(myFamilyId);
  const { data: methods = [] } = useMethods();
  const { data: paymentMethodConfigs = [] } = usePaymentMethodConfigs();
  const { data: myPayments = [] } = useMyFamilyPayments();
  const initiate = useInitiatePayment();
  const attach = useAttachReceipt();

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryPaymentId, setRetryPaymentId] = useState<string | null>(null);

  const rejectedPayments = myPayments.filter((p) => p.status === FamilyPaymentState.REJECTED);
  const retryTarget = rejectedPayments.find((p) => p._id === retryPaymentId);
  const retryConfig = retryTarget ? paymentMethodConfigs.find((c) => c._id === retryTarget.paymentMethodConfigId) : null;

  const handlePay = async (data: {
    method: string;
    amountMinor: number;
    currency: Currency;
    receiptFile?: File;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await initiate.mutateAsync({
        method: data.method,
        amountMinor: data.amountMinor,
        currency: data.currency,
      });

      if (res && 'kind' in res) {
        const result = res as {
          paymentId: string;
          clientSecret?: string;
          kind?: string;
          url?: string;
        };
        if (result.kind === 'REDIRECT' && result.url) {
          globalThis.location.href = result.url;
          return;
        }

        if (result.kind === 'AWAIT_RECEIPT' && data.receiptFile) {
          const fileKey = await uploadFileToS3({ file: data.receiptFile });
          await attach.mutateAsync({ paymentId: result.paymentId, fileKey });
        }
      }
      setShowPayDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('ledger')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPayDialog(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium">
          {t('pay')}
        </button>
      </div>

      {showPayDialog ? (
        <PayDialog
          methods={methods}
          paymentMethodConfigs={paymentMethodConfigs}
          onPay={handlePay}
          isSubmitting={isSubmitting || initiate.isPending || attach.isPending}
          onClose={() => setShowPayDialog(false)}
          onManualTransferSubmitted={() => setShowPayDialog(false)}
        />
      ) : null}

      {rejectedPayments.length > 0 ? (
        <div className="space-y-3">
          {rejectedPayments.map((payment) => (
            <div key={payment._id} className="bg-card space-y-2 rounded-lg border p-4">
              <p className="text-destructive text-sm font-medium">
                {t('rejected')}: {payment.rejectReason}
              </p>
              {retryPaymentId === payment._id ? null : (
                <button
                  type="button"
                  onClick={() => setRetryPaymentId(payment._id)}
                  className="hover:bg-muted rounded-md border px-3 py-1.5 text-sm font-medium">
                  {t('retry')}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {retryTarget && retryConfig ? (
        <ManualTransferPayPanel
          config={retryConfig}
          amountMinor={retryTarget.amountMinor}
          currency={retryTarget.currency}
          retryPaymentId={retryTarget._id}
          onSubmitted={() => setRetryPaymentId(null)}
        />
      ) : null}

      <LedgerTable
        entries={statement?.entries ?? []}
        balances={statement?.balances ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
