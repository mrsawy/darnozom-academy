'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { IconVideo } from '@tabler/icons-react';
import {
  useStudentBookings,
  useRequestReschedule,
  useRequestRefund,
  useSlotAvailability,
} from '@/lib/hooks/private-sessions/private-sessions.hook';
import {
  BookingStatus,
  RescheduleStatus,
  RefundRequestStatus,
  type ISessionBooking,
} from '@/lib/types/private-session/private-session.interface';
import {
  formatSlotDate,
  formatSlotTimeRange,
  formatCountdown,
  getJoinInfo,
} from '@/lib/utils/session-time';
import { Link } from '@/i18n/navigation';
import { ROUTE_STUDENT_BOOKING_CALL } from '@/lib/data/constants/routes.constants';

const STATUS_BADGE_VARIANTS: Record<
  BookingStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [BookingStatus.CONFIRMED]: 'default',
  [BookingStatus.PENDING_PAYMENT]: 'secondary',
  [BookingStatus.COMPLETED]: 'outline',
  [BookingStatus.CANCELLED]: 'destructive',
  [BookingStatus.NO_SHOW]: 'secondary',
  [BookingStatus.REFUNDED]: 'destructive',
};

/** Re-render on an interval so join countdowns tick and the join button auto-enables. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Join button reflecting the instant-based window: scheduled → joinable → ended. */
function JoinControl({ booking, now }: { booking: ISessionBooking; now: Date }) {
  const t = useTranslations('PrivateSessions');
  const join = getJoinInfo(booking.startsAt, booking.endsAt, now);

  // No join control when the window can't be determined (missing/legacy instants).
  if (!join || join.state === 'ended') return null;
  const { canJoin, msUntilJoinable } = join;

  if (!canJoin) {
    return (
      <Button size="sm" variant="secondary" disabled className="w-fit">
        {t('join.scheduled', { time: formatCountdown(msUntilJoinable) })}
      </Button>
    );
  }

  const className =
    'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors';

  if (booking.provider === 'AGORA') {
    return (
      <Link href={ROUTE_STUDENT_BOOKING_CALL(booking._id)} className={className}>
        <IconVideo size={16} />
        {t('join.joinNow')}
      </Link>
    );
  }

  if (booking.meetingLink) {
    return (
      <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className={className}>
        <IconVideo size={16} />
        {t('join.joinNow')}
      </a>
    );
  }

  return null;
}

/** Reschedule by choosing a real, available future slot of the same session. */
function RescheduleDialog({
  booking,
  open,
  onClose,
}: {
  booking: ISessionBooking | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('PrivateSessions');
  const locale = useLocale();
  const requestMutation = useRequestReschedule();
  const { data: slots, isLoading } = useSlotAvailability(
    open ? (booking?.sessionId ?? null) : null
  );

  const [newSlotId, setNewSlotId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (!booking) return null;

  const pendingReschedule =
    booking.rescheduleRequest?.status === RescheduleStatus.PENDING
      ? booking.rescheduleRequest
      : undefined;

  const availableSlots = (slots ?? []).filter((s) => s.isAvailable);

  const handleSubmit = async () => {
    if (!newSlotId || !reason) return;
    await requestMutation.mutateAsync({ bookingId: booking._id, newSlotId, reason });
    setNewSlotId(null);
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reschedule.request')}</DialogTitle>
        </DialogHeader>

        {pendingReschedule ? (
          <div className="space-y-3">
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm font-medium">{t('reschedule.pendingRequest')}</p>
              <p className="text-muted-foreground mt-1 text-sm">{pendingReschedule.reason}</p>
              <p className="mt-1 text-sm">
                {formatSlotDate(
                  pendingReschedule.newStartsAt,
                  pendingReschedule.newTimezone,
                  locale
                )}{' '}
                ·{' '}
                {formatSlotTimeRange(
                  pendingReschedule.newStartsAt,
                  pendingReschedule.newEndsAt,
                  pendingReschedule.newTimezone,
                  locale
                )}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {t(`reschedule.status.${pendingReschedule.status.toLowerCase()}`)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('reschedule.selectNewSlot')}</Label>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">{t('bookings.loadingSlots')}</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('reschedule.noOtherSlots')}</p>
              ) : (
                <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {availableSlots.map((slot) => {
                    const selected = newSlotId === slot.slotId;
                    return (
                      <button
                        key={slot.slotId}
                        type="button"
                        onClick={() => setNewSlotId(slot.slotId)}
                        className={[
                          'flex flex-col gap-0.5 rounded-lg border p-2 text-left text-sm transition-colors',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input hover:border-primary',
                        ].join(' ')}>
                        <span className="font-medium">
                          {formatSlotDate(slot.startsAt, slot.timezone, locale)}
                        </span>
                        <span
                          className={
                            selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }>
                          {formatSlotTimeRange(slot.startsAt, slot.endsAt, slot.timezone, locale)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t('reschedule.reason')}</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                {t('bookings.cancelAction')}
              </Button>
              <Button
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={!newSlotId || !reason || requestMutation.isPending}>
                {t('reschedule.submit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Cancel-and-refund request — instructor must approve (no self-cancel of confirmed bookings). */
function RefundDialog({
  booking,
  open,
  onClose,
}: {
  booking: ISessionBooking | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('PrivateSessions');
  const requestMutation = useRequestRefund();
  const [reason, setReason] = useState('');

  if (!booking) return null;

  const pending = booking.refundRequest?.status === RefundRequestStatus.PENDING;

  const handleSubmit = async () => {
    if (!reason) return;
    await requestMutation.mutateAsync({ bookingId: booking._id, reason });
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('refund.confirmTitle')}</DialogTitle>
        </DialogHeader>

        {pending ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm font-medium">{t('refund.pendingRequest')}</p>
            <p className="text-muted-foreground mt-1 text-sm">{booking.refundRequest?.reason}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('refund.reason')}</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('refund.reasonPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                {t('bookings.cancelAction')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={!reason || requestMutation.isPending}>
                {t('refund.submit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function StudentBookingsPage() {
  const t = useTranslations('StudentBookings');
  const tPS = useTranslations('PrivateSessions');
  const locale = useLocale();
  const now = useNow();
  const { data, isLoading } = useStudentBookings();
  const [rescheduleBooking, setRescheduleBooking] = useState<ISessionBooking | null>(null);
  const [refundBooking, setRefundBooking] = useState<ISessionBooking | null>(null);

  const bookings = data?.docs ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-28" />
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && bookings.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t('noBookings')}</p>
        </div>
      )}

      {!isLoading && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const refundPending = booking.refundRequest?.status === RefundRequestStatus.PENDING;
            return (
              <Card key={booking._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {booking.session?.title ?? tPS('bookings.bookSession')}
                    </CardTitle>
                    <Badge variant={STATUS_BADGE_VARIANTS[booking.status]}>
                      {tPS(`bookings.status.${booking.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-muted-foreground text-sm">
                    <span>{formatSlotDate(booking.startsAt, booking.timezone, locale)}</span>
                    {' · '}
                    <span>
                      {formatSlotTimeRange(
                        booking.startsAt,
                        booking.endsAt,
                        booking.timezone,
                        locale
                      )}
                    </span>
                  </div>

                  {booking.instructor ? (
                    <div className="text-sm">
                      {t('instructor')}: {booking.instructor.firstName}{' '}
                      {booking.instructor.lastName}
                    </div>
                  ) : null}

                  {booking.notes ? (
                    <div className="text-muted-foreground text-sm italic">{booking.notes}</div>
                  ) : null}

                  {/* Join control — window-gated */}
                  {booking.status === BookingStatus.CONFIRMED && (
                    <JoinControl booking={booking} now={now} />
                  )}

                  {/* Reschedule status */}
                  {booking.rescheduleRequest ? (
                    <div className="text-sm">
                      {tPS('reschedule.request')}:{' '}
                      <strong>
                        {tPS(`reschedule.status.${booking.rescheduleRequest.status.toLowerCase()}`)}
                      </strong>
                    </div>
                  ) : null}

                  {/* Refund status */}
                  {booking.refundRequest ? (
                    <div className="text-sm">
                      {tPS('refund.request')}:{' '}
                      <strong>
                        {tPS(`refund.status.${booking.refundRequest.status.toLowerCase()}`)}
                      </strong>
                    </div>
                  ) : null}

                  {/* Actions */}
                  {booking.status === BookingStatus.CONFIRMED && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRescheduleBooking(booking)}>
                        {tPS('reschedule.request')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={refundPending}
                        onClick={() => setRefundBooking(booking)}>
                        {tPS('refund.request')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RescheduleDialog
        booking={rescheduleBooking}
        open={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
      />
      <RefundDialog
        booking={refundBooking}
        open={!!refundBooking}
        onClose={() => setRefundBooking(null)}
      />
    </div>
  );
}
