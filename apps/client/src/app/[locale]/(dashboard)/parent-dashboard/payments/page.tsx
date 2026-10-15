'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useUserStore from '@/lib/store/userStore';
import {
  useAttachReceipt,
  useInitiatePayment,
  useMethods,
  useStatement,
} from '@/lib/hooks/billing/use-billing.hook';
import { LedgerTable } from '@/components/organs/billing/ledger-table';
import { PayDialog } from './__components/pay-dialog';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import type { Currency } from '@darnozom/shared-types';

export default function ParentPaymentsPage() {
  const t = useTranslations('Billing');
  const user = useUserStore((s) => s.user);
  const myFamilyId = user?._id ?? '';

  const { data: statement, isLoading } = useStatement(myFamilyId);
  const { data: methods = [] } = useMethods();
  const initiate = useInitiatePayment();
  const attach = useAttachReceipt();

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (res.kind === 'REDIRECT' && res.url) {
          globalThis.location.href = res.url;
          return;
        }

        if (res.kind === 'AWAIT_RECEIPT' && data.receiptFile) {
          const fileKey = await uploadFileToS3({ file: data.receiptFile });
          await attach.mutateAsync({ paymentId: res.paymentId, fileKey });
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
          onPay={handlePay}
          isSubmitting={isSubmitting || initiate.isPending || attach.isPending}
          onClose={() => setShowPayDialog(false)}
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
