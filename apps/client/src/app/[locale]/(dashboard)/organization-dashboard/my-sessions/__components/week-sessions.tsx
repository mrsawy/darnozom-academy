'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';
import { useSessions } from '@/lib/hooks/academics/use-academics.hook';
import { useTeacherDashboard } from '@/lib/hooks/dashboard/use-dashboard.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { dayKey, formatClock } from '@/lib/utils/academics/session-time';
import { addWeeks, weekRange } from '@/lib/utils/academics/week-range';

function TeacherUpcomingSection() {
  const t = useTranslations('TeacherDashboard');
  const locale = useLocale();
  const { data: dashboard, isLoading } = useTeacherDashboard();
  const sessions = dashboard?.sessions ?? [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
        ) : (
          <div className="divide-y rounded-md border">
            {sessions.map((session) => (
              <div
                key={session._id}
                className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {session.groupName} · #{session.sessionNumber}
                    </span>
                    <SessionStatusBadge status={session.status} />
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {new Intl.DateTimeFormat(locale, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(session.startsAt))}
                  </p>
                </div>
                {session.actionLabel && (
                  <Button
                    asChild
                    size="sm"
                    variant={session.actionLabel === 'TAKE_ATTENDANCE' ? 'default' : 'outline'}>
                    <Link href={ROUTE_ORG_SESSION(session._id)}>
                      {session.actionLabel === 'TAKE_ATTENDANCE'
                        ? t('takeAttendance')
                        : session.actionLabel === 'SUBMIT_REPORT'
                        ? t('submitReport')
                        : t('enterFinalResults')}
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WeekSessions() {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: user } = useAuthUser();
  const [anchor, setAnchor] = useState(() => new Date());
  const { from, to } = weekRange(anchor);
  const { data: sessions = [], isLoading } = useSessions(
    { teacherId: user?._id, from: from.toISOString(), to: to.toISOString() },
    !!user
  );

  const days = Array.from(
    { length: 7 },
    (_, offset) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset)
  );
  const byDay = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = dayKey(session.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), session]);
  }

  return (
    <div className="space-y-4 p-4">
      <TeacherUpcomingSection />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('sessions.mySessions.title')}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor((prev) => addWeeks(prev, -1))}>
            {t('sessions.mySessions.previousWeek')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            {t('sessions.mySessions.thisWeek')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor((prev) => addWeeks(prev, 1))}>
            {t('sessions.mySessions.nextWeek')}
          </Button>
        </div>
      </div>
      {isLoading ? <p>{t('loading')}</p> : null}
      {!isLoading && sessions.length === 0 ? (
        <p className="text-muted-foreground">{t('sessions.mySessions.noSessions')}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => {
          const list = byDay.get(dayKey(day.toISOString())) ?? [];
          if (list.length === 0) return null;
          return (
            <Card key={day.toISOString()}>
              <CardHeader>
                <CardTitle className="text-base">
                  {new Intl.DateTimeFormat(locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  }).format(day)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((session) => (
                  <Link
                    key={session._id}
                    href={ROUTE_ORG_SESSION(session._id)}
                    className="block rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{formatClock(session.startsAt, locale)}</span>
                      <SessionStatusBadge status={session.status} />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {session.groupName} · #{session.sequence}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
