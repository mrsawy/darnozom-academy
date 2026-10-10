'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { Label } from '@/components/atoms/label';
import { Badge } from '@/components/atoms/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import {
  useBookPrivateSession,
  useSlotAvailability,
} from '@/lib/hooks/private-sessions/private-sessions.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { useViewerCurrency } from '@/lib/hooks/currency/use-viewer-currency.hook';
import type {
  IPrivateSession,
  ISlotAvailability,
} from '@/lib/types/private-session/private-session.interface';
import { formatSlotDate, formatSlotTimeRange } from '@/lib/utils/session-time';
import { Currency, PaymentMethod, PaymentProvider } from '@lms-organization/shared-types';

interface BookingDialogProps {
  session: IPrivateSession | null;
  open: boolean;
  onClose: () => void;
}

function SlotCard({
  slot,
  selected,
  onClick,
}: {
  slot: ISlotAvailability;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('PrivateSessions');
  const locale = useLocale();
  const spotsLeft = slot.maxBookings - slot.currentBookings;
  const pct = Math.round((slot.currentBookings / slot.maxBookings) * 100);

  return (
    <button
      type="button"
      disabled={!slot.isAvailable}
      onClick={onClick}
      className={[
        'flex w-full flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors',
        slot.isAvailable
          ? selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input hover:border-primary'
          : 'bg-muted cursor-not-allowed opacity-50',
      ].join(' ')}>
      <span className="font-semibold">{formatSlotDate(slot.startsAt, slot.timezone, locale)}</span>
      <span
        className={
          selected && slot.isAvailable ? 'text-primary-foreground/80' : 'text-muted-foreground'
        }>
        {formatSlotTimeRange(slot.startsAt, slot.endsAt, slot.timezone, locale)}
      </span>
      <div className="mt-1 flex items-center gap-2">
        {/* Capacity bar */}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 100 ? 'bg-destructive' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span
          className={`shrink-0 text-xs ${selected && slot.isAvailable ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {slot.isAvailable
            ? t('bookings.spotsLeft', { count: spotsLeft, max: slot.maxBookings })
            : t('bookings.full')}
        </span>
      </div>
    </button>
  );
}

export function BookingDialog({ session, open, onClose }: BookingDialogProps) {
  const t = useTranslations('PrivateSessions');
  const { data: user } = useAuthUser();
  const bookMutation = useBookPrivateSession();

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  /** WALLET or DIRECT — DIRECT requires `provider` (same pattern as course enrollment). */
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.WALLET);
  const [notes, setNotes] = useState('');

  const { data: slots, isLoading } = useSlotAvailability(open ? (session?._id ?? null) : null);
  const { toDisplayPrice } = useViewerCurrency();

  if (!session) return null;

  /** Mirrors server `SessionBookingService.convertSessionPrice` — what the viewer is charged. */
  const displayPrice = toDisplayPrice(session.pricing) ?? {
    amount: session.pricing.price,
    currency: session.pricing.currency,
  };

  const handleBook = async () => {
    if (!selectedSlotId) return;

    const result = await bookMutation.mutateAsync({
      sessionId: session._id,
      slotId: selectedSlotId,
      paymentMethod,
      ...(paymentMethod === PaymentMethod.WALLET ? {} : { provider: PaymentProvider.PAYMOB }),
      currency: user?.preferredCurrency ?? Currency.DEFAULT,
      notes,
    });

    if ('paymentUrl' in result && result.paymentUrl) {
      globalThis.location.href = result.paymentUrl;
    } else {
      onClose();
    }
  };

  const availableCount = slots?.filter((s) => s.isAvailable).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('bookings.bookSession')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session summary */}
          <div className="bg-muted rounded-md p-3">
            <p className="font-medium">{session.title}</p>
            <p className="text-muted-foreground text-sm">
              {t('sessionSummary', {
                count: session.duration,
                price: displayPrice.amount,
                currency: displayPrice.currency,
              })}
            </p>
          </div>

          {/* Slot list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('bookings.selectTimeSlot')}</Label>
              {isLoading ? (
                <span className="text-muted-foreground text-xs">{t('bookings.loadingSlots')}</span>
              ) : null}
              {!isLoading && slots ? (
                <Badge
                  variant={availableCount > 0 ? 'secondary' : 'destructive'}
                  className="text-xs">
                  {t('bookings.slotsAvailable', { count: availableCount })}
                </Badge>
              ) : null}
            </div>

            {isLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-muted h-20 animate-pulse rounded-lg border" />
                ))}
              </div>
            ) : null}

            {!isLoading && (!slots || slots.length === 0) && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {t('bookings.noSlots')}
              </p>
            )}

            {!isLoading && slots && slots.length > 0 ? (
              <div className="grid max-h-60 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.slotId}
                    slot={slot}
                    selected={selectedSlotId === slot.slotId}
                    onClick={() => setSelectedSlotId(slot.slotId)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Payment method */}
          <div className="space-y-1">
            <Label>{t('bookings.paymentMethod')}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PaymentMethod.WALLET}>{t('bookings.payWithWallet')}</SelectItem>
                <SelectItem value={PaymentMethod.DIRECT}>{t('bookings.payWithCard')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">{t('bookings.notes')}</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('bookings.notesPlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {t('bookings.cancelAction')}
            </Button>
            <Button
              onClick={() => {
                void handleBook();
              }}
              disabled={!selectedSlotId || bookMutation.isPending}>
              {bookMutation.isPending ? t('bookings.booking') : t('bookings.bookSession')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
