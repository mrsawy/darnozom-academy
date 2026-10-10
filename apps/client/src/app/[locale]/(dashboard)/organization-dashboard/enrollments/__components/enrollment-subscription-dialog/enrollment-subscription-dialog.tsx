'use client';

import { IEnrollment, SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { useTranslations } from 'next-intl';

interface EnrollmentSubscriptionDialogProps {
  enrollment: IEnrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusBadgeVariant = (
  status: SubscriptionStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case SubscriptionStatus.ACTIVE: {
      return 'default';
    }
    case SubscriptionStatus.EXPIRED: {
      return 'secondary';
    }
    case SubscriptionStatus.CANCELLED:
    case SubscriptionStatus.SUSPENDED: {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function EnrollmentSubscriptionDialog({
  enrollment,
  open,
  onOpenChange,
}: EnrollmentSubscriptionDialogProps) {
  const t = useTranslations('EnrollmentDataTable');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('subscriptionDetails')}</DialogTitle>
          <DialogDescription>{t('subscriptionInfo')}</DialogDescription>
        </DialogHeader>

        {enrollment?.subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="font-medium">{t('status')}</span>
              <Badge variant={getStatusBadgeVariant(enrollment.subscription.status)}>
                {enrollment.subscription.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <label htmlFor="start-date" className="text-sm font-medium opacity-70">
                  {t('startDate')}
                </label>
                <p id="start-date" className="text-lg font-semibold">
                  {formatDate(enrollment.subscription.starts_at)}
                </p>
              </div>

              {enrollment.subscription.ends_at ? (
                <div className="rounded-lg border p-4">
                  <label htmlFor="end-date" className="text-sm font-medium opacity-70">
                    {t('endDate')}
                  </label>
                  <p id="end-date" className="text-lg font-semibold">
                    {formatDate(enrollment.subscription.ends_at)}
                  </p>
                </div>
              ) : null}

              {enrollment.subscription.next_billing ? (
                <div className="rounded-lg border p-4">
                  <label htmlFor="next-billing" className="text-sm font-medium opacity-70">
                    {t('nextBilling')}
                  </label>
                  <p id="next-billing" className="text-lg font-semibold">
                    {formatDate(enrollment.subscription.next_billing)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium">{t('billingInfo')}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label htmlFor="billing-name" className="opacity-70">
                    {t('name')}
                  </label>
                  <p id="billing-name" className="font-medium">
                    {enrollment.subscription.billing.first_name}{' '}
                    {enrollment.subscription.billing.last_name}
                  </p>
                </div>
                <div>
                  <label htmlFor="billing-email" className="opacity-70">
                    {t('email')}
                  </label>
                  <p id="billing-email" className="font-medium">
                    {enrollment.subscription.billing.email}
                  </p>
                </div>
                <div>
                  <label htmlFor="billing-amount" className="opacity-70">
                    {t('amount')}
                  </label>
                  <p id="billing-amount" className="font-medium">
                    {enrollment.subscription.billing.amount}{' '}
                    {enrollment.subscription.billing.currency}
                  </p>
                </div>
                <div>
                  <label htmlFor="billing-cycle" className="opacity-70">
                    {t('billingCycle')}
                  </label>
                  <p id="billing-cycle" className="font-medium capitalize">
                    {enrollment.subscription.billing.billingCycle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
