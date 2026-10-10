'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Separator } from '@/components/atoms/separator';
import {
  ROUTE_ORG_PRIVATE_SESSION_EDIT,
  ROUTE_ORG_PRIVATE_SESSIONS,
} from '@/lib/data/constants/routes.constants';
import { usePrivateSessionById } from '@/lib/hooks/private-sessions/private-sessions.hook';
import { BookingList } from '../__components/booking-list';
import { SessionType } from '@/lib/types/private-session/private-session.interface';
import { formatSlotDate, formatSlotTimeRange } from '@/lib/utils/session-time';

interface Props {
  params: Promise<{ id: string }>;
}

export default function PrivateSessionDetailPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations('PrivateSessions');
  const locale = useLocale();
  const { data: session, isLoading } = usePrivateSessionById(id);

  if (isLoading) {
    return <div className="animate-pulse p-6">{t('loading')}</div>;
  }

  if (!session) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">{t('sessionNotFound')}</p>
        <Button className="mt-4" asChild>
          <Link href={ROUTE_ORG_PRIVATE_SESSIONS}>{t('backToSessions')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <p className="text-muted-foreground">
            {t('durationMinutes', { count: session.duration })} ·{' '}
            {session.sessionType === SessionType.ONLINE ? t('form.online') : t('form.offline')} ·{' '}
            {session.pricing.price} {session.pricing.currency}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={ROUTE_ORG_PRIVATE_SESSION_EDIT(id)}>{t('editSession')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={ROUTE_ORG_PRIVATE_SESSIONS}>{t('back')}</Link>
          </Button>
        </div>
      </div>

      {session.description ? <p className="text-muted-foreground">{session.description}</p> : null}

      {/* Available Slots */}
      <Card>
        <CardHeader>
          <CardTitle>{t('form.availableSlots')}</CardTitle>
        </CardHeader>
        <CardContent>
          {session.availableSlots.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noTimeSlots')}</p>
          ) : (
            <div className="space-y-2">
              {session.availableSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline">
                    {formatSlotDate(slot.startsAt, slot.timezone, locale)}
                  </Badge>
                  <span>
                    {formatSlotTimeRange(slot.startsAt, slot.endsAt, slot.timezone, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Bookings */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t('bookings.title')}</h2>
        <BookingList />
      </div>
    </div>
  );
}
