'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { ReceiptQueue } from '@/components/organs/billing/receipt-queue';
import {
  useApprovePayment,
  useReceiptQueue,
  useRejectPayment,
} from '@/lib/hooks/billing/use-billing.hook';

export interface ReviewPaymentsModalProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewPaymentsModal({ groupId, open, onOpenChange }: ReviewPaymentsModalProps) {
  const t = useTranslations('Billing');
  const { data: queue = [], isLoading } = useReceiptQueue({ groupId }, open);
  const approve = useApprovePayment();
  const reject = useRejectPayment();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('reviewPayments')}</DialogTitle>
        </DialogHeader>
        <ReceiptQueue
          payments={queue}
          isLoading={isLoading}
          onApprove={(id) => approve.mutate(id)}
          onReject={(id, reason) => reject.mutate({ paymentId: id, reason })}
        />
      </DialogContent>
    </Dialog>
  );
}
