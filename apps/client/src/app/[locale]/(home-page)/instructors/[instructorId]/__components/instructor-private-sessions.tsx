'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@/lib/utils';
import { formatSlotDate, formatSlotTime } from '@/lib/utils/session-time';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/atoms/card';
import { AuthDialog } from '@/components/organs/auth-dialog/auth-dialog';
import { useInstructorAvailableSessions } from '@/lib/hooks/private-sessions/private-sessions.hook';
import { useAuthUser, userKeys } from '@/lib/hooks/user/use-user.hook';
import {
  SessionType,
  type IPrivateSession,
} from '@/lib/types/private-session/private-session.interface';
import { BookingDialog } from './booking-dialog';
import { PriceWithCurrency } from '@/components/atoms/price-with-currency';
import type { Currency } from '@lms-organization/shared-types';
import { useViewerCurrency } from '@/lib/hooks/currency/use-viewer-currency.hook';

interface Props {
  instructorId: string;
}

function sessionsWithSlots(sessions: IPrivateSession[] | undefined): IPrivateSession[] {
  if (!sessions?.length) return [];
  return sessions.filter((s) => Array.isArray(s.availableSlots) && s.availableSlots.length > 0);
}

export function InstructorPrivateSessions({ instructorId }: Props) {
  const t = useTranslations('PrivateSessions');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const { data: sessions, isLoading } = useInstructorAvailableSessions(instructorId);
  const { toDisplayPrice } = useViewerCurrency();
  const [selectedSession, setSelectedSession] = useState<IPrivateSession | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSessionAfterAuth, setPendingSessionAfterAuth] = useState<IPrivateSession | null>(
    null
  );

  const bookableSessions = sessionsWithSlots(sessions);

  const handleBookClick = (session: IPrivateSession) => {
    if (!user) {
      setPendingSessionAfterAuth(session);
      setAuthOpen(true);
      return;
    }
    setSelectedSession(session);
  };

  const handleAuthDialogClose = () => {
    setAuthOpen(false);
    setPendingSessionAfterAuth(null);
  };

  const handleAuthenticated = () => {
    void queryClient.invalidateQueries({ queryKey: userKeys.me() });
    if (pendingSessionAfterAuth) {
      setSelectedSession(pendingSessionAfterAuth);
      setPendingSessionAfterAuth(null);
    }
    setAuthOpen(false);
  };

  if (isLoading) {
    return (
      <section className="space-y-4" aria-busy="true" aria-label={t('title')}>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // Only show this block when the instructor has at least one active session with configured slots.
  if (bookableSessions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {bookableSessions.map((session) => (
          <Card key={session._id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{session.title}</CardTitle>
                <Badge variant="outline">
                  {session.sessionType === SessionType.ONLINE
                    ? t('form.online')
                    : t('form.offline')}
                </Badge>
              </div>
              <CardDescription>{t('durationMinutes', { count: session.duration })}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {session.description ? (
                <p className="text-muted-foreground line-clamp-2 text-sm">{session.description}</p>
              ) : null}

              <PriceWithCurrency
                className="block text-xl font-bold"
                {...(toDisplayPrice(session.pricing) ?? {
                  amount: session.pricing.price,
                  currency: session.pricing.currency as Currency,
                })}
              />

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('form.availableSlots')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {session.availableSlots.slice(0, 4).map((slot, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {formatSlotDate(slot.startsAt, slot.timezone, locale)} ·{' '}
                      {formatSlotTime(slot.startsAt, slot.timezone, locale)}
                      {slot.maxBookings > 1 && (
                        <span className="ml-1 opacity-70">·{slot.maxBookings}</span>
                      )}
                    </Badge>
                  ))}
                  {session.availableSlots.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('moreSlots', { count: session.availableSlots.length - 4 })}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                type="button"
                className="mt-auto w-full"
                onClick={() => handleBookClick(session)}>
                {t('bookings.bookSession')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AuthDialog
        open={authOpen}
        onClose={handleAuthDialogClose}
        title={t('bookings.authRequiredTitle')}
        description={t('bookings.authRequiredDescription')}
        onAuthenticated={handleAuthenticated}
      />

      <BookingDialog
        session={selectedSession}
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </section>
  );
}
