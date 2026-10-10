'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  useInstructorBookings,
  useMarkSessionCompleted,
  useMarkSessionNoShow,
  useRespondToReschedule,
  useRespondToRefund,
} from '@/lib/hooks/private-sessions/private-sessions.hook';
import {
  BookingStatus,
  RescheduleStatus,
  RefundRequestStatus,
} from '@/lib/types/private-session/private-session.interface';
import { formatSlotDate, formatSlotTimeRange } from '@/lib/utils/session-time';

const STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING_PAYMENT]: 'bg-yellow-100 text-yellow-800',
  [BookingStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [BookingStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
  [BookingStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [BookingStatus.NO_SHOW]: 'bg-gray-100 text-gray-800',
  [BookingStatus.REFUNDED]: 'bg-red-100 text-red-800',
};

export function BookingList() {
  const t = useTranslations('PrivateSessions');
  const locale = useLocale();
  const { data, isLoading } = useInstructorBookings();
  const completeMutation = useMarkSessionCompleted();
  const noShowMutation = useMarkSessionNoShow();
  const respondReschedule = useRespondToReschedule();
  const respondRefund = useRespondToRefund();

  /** Per-booking rejection reason inputs, keyed by bookingId. */
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-muted-foreground">{t('bookings.loadingSlots')}</p>;

  const bookings = data?.docs ?? [];

  if (bookings.length === 0) {
    return <p className="text-muted-foreground">{t('bookings.noBookings')}</p>;
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const rejectReason = rejectReasons[booking._id] ?? '';
        const setReason = (v: string) => setRejectReasons((r) => ({ ...r, [booking._id]: v }));

        return (
          <Card key={booking._id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {booking.session?.title ?? t('bookings.bookSession')}
                </CardTitle>
                <Badge className={STATUS_COLORS[booking.status]}>
                  {t(`bookings.status.${booking.status.toLowerCase()}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-muted-foreground text-sm">
                <span>{formatSlotDate(booking.startsAt, booking.timezone, locale)}</span>
                {' · '}
                <span>
                  {formatSlotTimeRange(booking.startsAt, booking.endsAt, booking.timezone, locale)}
                </span>
              </div>

              {booking.student ? (
                <div className="text-sm">
                  {booking.student.firstName} {booking.student.lastName}
                </div>
              ) : null}

              {booking.notes ? (
                <div className="text-muted-foreground text-sm italic">{booking.notes}</div>
              ) : null}

              {/* Reschedule request */}
              {booking.rescheduleRequest?.status === RescheduleStatus.PENDING && (
                <div className="space-y-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm font-medium">{t('reschedule.pendingRequest')}</p>
                  <p className="text-muted-foreground text-sm">
                    {booking.rescheduleRequest.reason}
                  </p>
                  <p className="text-sm">
                    {formatSlotDate(
                      booking.rescheduleRequest.newStartsAt,
                      booking.rescheduleRequest.newTimezone,
                      locale
                    )}{' '}
                    ·{' '}
                    {formatSlotTimeRange(
                      booking.rescheduleRequest.newStartsAt,
                      booking.rescheduleRequest.newEndsAt,
                      booking.rescheduleRequest.newTimezone,
                      locale
                    )}
                  </p>
                  <Input
                    placeholder={t('reschedule.rejectionReason')}
                    value={rejectReason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={respondReschedule.isPending}
                      onClick={() =>
                        respondReschedule.mutate({ bookingId: booking._id, action: 'APPROVED' })
                      }>
                      {t('reschedule.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={respondReschedule.isPending}
                      onClick={() =>
                        respondReschedule.mutate({
                          bookingId: booking._id,
                          action: 'REJECTED',
                          rejectionReason: rejectReason || undefined,
                        })
                      }>
                      {t('reschedule.reject')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Refund request */}
              {booking.refundRequest?.status === RefundRequestStatus.PENDING && (
                <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium">{t('refund.pendingRequest')}</p>
                  <p className="text-muted-foreground text-sm">{booking.refundRequest.reason}</p>
                  <Input
                    placeholder={t('refund.rejectionReason')}
                    value={rejectReason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={respondRefund.isPending}
                      onClick={() =>
                        respondRefund.mutate({ bookingId: booking._id, action: 'APPROVED' })
                      }>
                      {t('refund.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={respondRefund.isPending}
                      onClick={() =>
                        respondRefund.mutate({
                          bookingId: booking._id,
                          action: 'REJECTED',
                          rejectionReason: rejectReason || undefined,
                        })
                      }>
                      {t('refund.reject')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructor actions */}
              {booking.status === BookingStatus.CONFIRMED && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate(booking._id)}>
                    {t('markCompleted')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={noShowMutation.isPending}
                    onClick={() => noShowMutation.mutate(booking._id)}>
                    {t('markNoShow')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
