'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import useUserStore from '@/lib/store/userStore';
import { useChildren } from '@/lib/hooks/parent/useParent.hook';
import {
  useAttachReceipt,
  useFamilySubscriptions,
  useInitiatePayment,
  useMethods,
  useMyFamilyPayments,
  usePaymentMethodConfigs,
  useStatement,
} from '@/lib/hooks/billing/use-billing.hook';
import { LedgerTable } from '@/components/organs/billing/ledger-table';
import { ManualTransferPayPanel } from '@/components/organs/billing/manual-transfer-pay-panel';
import { PaymentStatusBadge } from '@/components/organs/billing/payment-status-badge';
import { PayDialog } from './__components/pay-dialog';
import { OutstandingSubscriptions, type OutstandingSubscriptionRow } from './__components/outstanding-subscriptions';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';

export default function ParentPaymentsPage() {
  const t = useTranslations('Billing');
  const user = useUserStore((s) => s.user);
  const myFamilyId = user?._id ?? '';

  const { data: statement, isLoading } = useStatement(myFamilyId);
  const { data: subscriptions = [] } = useFamilySubscriptions(myFamilyId);
  const { data: children = [] } = useChildren();
  const { data: methods = [] } = useMethods();
  const { data: paymentMethodConfigs = [] } = usePaymentMethodConfigs();
  const { data: myPayments = [] } = useMyFamilyPayments();
  const initiate = useInitiatePayment();
  const attach = useAttachReceipt();

  const [payingRow, setPayingRow] = useState<OutstandingSubscriptionRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryPaymentId, setRetryPaymentId] = useState<string | null>(null);

  const rejectedPayments = myPayments.filter((p) => p.status === FamilyPaymentState.REJECTED);
  const underReviewPayments = myPayments.filter((p) => p.status === FamilyPaymentState.PENDING_REVIEW);
  const retryTarget = rejectedPayments.find((p) => p._id === retryPaymentId);
  const retryConfig = retryTarget ? paymentMethodConfigs.find((c) => c._id === retryTarget.paymentMethodConfigId) : null;

  const outstandingRows: OutstandingSubscriptionRow[] = (statement?.openSubscriptions ?? []).map((balance) => {
    const subscription = subscriptions.find((s) => s._id === balance.subscriptionId);
    const studentNames = balance.studentIds
      .map((id) => children.find((c) => c._id === id)?.firstName)
      .filter((name): name is string => Boolean(name));
    return { balance, subscription, studentNames };
  });

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
      setPayingRow(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('ledger')}</p>
      </div>

      <OutstandingSubscriptions rows={outstandingRows} onPay={setPayingRow} />

      {payingRow ? (
        <PayDialog
          methods={methods}
          paymentMethodConfigs={paymentMethodConfigs}
          fixedAmount={{
            amountMinor: payingRow.balance.outstandingMinor,
            currency: payingRow.balance.currency,
            subscriptionId: payingRow.balance.subscriptionId,
          }}
          onPay={handlePay}
          isSubmitting={isSubmitting || initiate.isPending || attach.isPending}
          onClose={() => setPayingRow(null)}
          onManualTransferSubmitted={() => {
            setPayingRow(null);
            toast.success(t('paymentSubmittedUnderReview'));
          }}
        />
      ) : null}

      {underReviewPayments.length > 0 ? (
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            {t('paymentsUnderReview')}
          </h3>
          {underReviewPayments.map((payment) => (
            <div key={payment._id} className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
              <span className="font-medium">{payment.methodSnapshot?.label ?? t(`method.${payment.method}`)}</span>
              <PaymentStatusBadge status="UNDER_REVIEW" />
            </div>
          ))}
        </div>
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
          onSubmitted={() => {
            setRetryPaymentId(null);
            toast.success(t('paymentSubmittedUnderReview'));
          }}
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
