'use client';

import { useTranslations } from 'next-intl';
import {
  useApprovePayment,
  useReceiptQueue,
  useRejectPayment,
} from '@/lib/hooks/billing/use-billing.hook';
import { ReceiptQueue } from '@/components/organs/billing/receipt-queue';

export default function AccountantReceiptsPage() {
  const t = useTranslations('Billing');
  const { data: queue, isLoading } = useReceiptQueue();
  const approve = useApprovePayment();
  const reject = useRejectPayment();

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('receipts')}</h1>
        <p className="text-muted-foreground text-sm">{t('receiptQueueSubtitle')}</p>
      </div>

      <ReceiptQueue
        payments={queue ?? []}
        isLoading={isLoading}
        onApprove={(id) => approve.mutate(id)}
        onReject={(id, reason) => reject.mutate({ paymentId: id, reason })}
      />
    </div>
  );
}
