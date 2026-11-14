'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BillingSubscriptionStatus, GroupPaymentStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { PaymentStatusBadge } from '@/components/organs/billing/payment-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import {
  useCreateSubscription,
  useEndSubscription,
  useGroupSubscriptions,
  useReceiptQueue,
} from '@/lib/hooks/billing/use-billing.hook';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import { SubscriptionForm } from '@/components/organs/billing/subscription-form';
import type { IBillingSubscription } from '@/lib/types/billing/billing';
import { ReviewPaymentsModal } from './review-payments-modal';
import { RecordPaymentDialog } from './record-payment-dialog';
import { PaymentDetailsDialog } from './payment-details-dialog';
import { Link } from '@/i18n/navigation';

export function SubscriptionsCard({ group, disabled }: { group: IGroupDetail; disabled: boolean }) {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const { data: subscriptions = [], isLoading } = useGroupSubscriptions(group._id);
  const createSubscription = useCreateSubscription();
  const endSubscription = useEndSubscription();
  const [showForm, setShowForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [payingSub, setPayingSub] = useState<IBillingSubscription | null>(null);
  const [detailsSub, setDetailsSub] = useState<IBillingSubscription | null>(null);
  const { data: pendingPayments = [] } = useReceiptQueue({ groupId: group._id, status: 'PENDING_REVIEW' });

  const studentCandidates = group.students.map((s) => ({
    _id: s.studentId,
    name: group.people[s.studentId] ?? s.studentId,
  }));

  const paymentStatusMap = new Map(group.students.map((s) => [s.studentId, s.paymentStatus]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('subscriptions')}</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
            {t('reviewPayments')}
            {pendingPayments.length > 0 ? ` (${pendingPayments.length})` : ''}
          </Button>
          {!disabled && (
            <Button
              size="sm"
              variant={showForm ? 'outline' : 'default'}
              onClick={() => setShowForm((prev) => !prev)}>
              {showForm ? t('cancel') : t('newSubscription')}
            </Button>
          )}
        </div>
      </CardHeader>
      <ReviewPaymentsModal groupId={group._id} open={showReview} onOpenChange={setShowReview} />
      <CardContent className="space-y-4">
        {showForm && !disabled ? (
          <div className="mb-4">
            <SubscriptionForm
              students={studentCandidates}
              defaultGroupId={group._id}
              isSubmitting={createSubscription.isPending}
              onSubmit={(data) => {
                createSubscription.mutate(data, {
                  onSuccess: () => setShowForm(false),
                });
              }}
            />
          </div>
        ) : null}

        {isLoading ? (
          <LoadingState />
        ) : subscriptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('student')}</TableHead>
                <TableHead>{t('typeLabel')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('paymentStatus')}</TableHead>
                <TableHead>{t('statusLabel')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => {
                const isActive = sub.status === BillingSubscriptionStatus.ACTIVE;
                return (
                  <TableRow key={sub._id}>
                    <TableCell>
                      {sub.items
                        .map((item) => group.people[item.studentId] ?? item.studentId)
                        .join(', ')}
                    </TableCell>
                    <TableCell>
                      <span className="bg-muted inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                        {t(`type.${sub.type}`)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatMoney(sub.amountMinor, sub.currency, locale)}
                    </TableCell>
                    <TableCell>
                      {sub.items.map((item) => {
                        const status = paymentStatusMap.get(item.studentId) ?? GroupPaymentStatus.UNPAID;
                        return <PaymentStatusBadge key={item.studentId} status={status} />;
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-xs">
                        {isActive ? t('active') : t('ended')}
                      </span>
                    </TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      {pendingPayments.some((p) => p.familyId === sub.familyId) ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setDetailsSub(sub)}>
                            {t('paymentDetails')}
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/organization-dashboard/billing/receipts">
                              {t('openPaymentsPage')}
                            </Link>
                          </Button>
                        </>
                      ) : null}
                      {isActive && !disabled ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setPayingSub(sub)}>
                            {t('recordPayment')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={endSubscription.isPending}
                            onClick={() => endSubscription.mutate(sub._id)}>
                            {t('end')}
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {detailsSub ? (
        <PaymentDetailsDialog
          payments={pendingPayments.filter((p) => p.familyId === detailsSub.familyId)}
          open
          onOpenChange={(open) => {
            if (!open) setDetailsSub(null);
          }}
        />
      ) : null}
      {payingSub ? (
        <RecordPaymentDialog
          subscription={payingSub}
          open
          onOpenChange={(open) => {
            if (!open) setPayingSub(null);
          }}
        />
      ) : null}
    </Card>
  );
}
