'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';
import type { ITeacherOverview } from '@/lib/types/academics/academics';
import { formatSessionTime } from '@/lib/utils/academics/session-time';

export function TeacherSessionsTable({ sessions }: { sessions: ITeacherOverview['recentSessions'] }) {
  const t = useTranslations('Academics');
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('teacherPage.recentSessions')}</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('sessions.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('teacherPage.group')}</TableHead>
                  <TableHead>{t('sessions.when')}</TableHead>
                  <TableHead>{t('sessions.status')}</TableHead>
                  <TableHead>{t('sessions.attendance.teacher')}</TableHead>
                  <TableHead>{t('teacherPage.joined')}</TableHead>
                  <TableHead>{t('sessions.report.title')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Link href={ROUTE_ORG_SESSION(session.id)} className="font-medium hover:underline">
                        {session.groupName ?? '—'} · {session.sequence}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{formatSessionTime(session.startsAt, locale)}</TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      {session.teacherAttendance ? t(`sessions.attendance.statuses.${session.teacherAttendance}`) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.joinedAt
                        ? `${new Date(session.joinedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}${
                            session.joinedMinutes === null || session.joinedMinutes < 1 ? '' : ` · ${t('teacherPage.minutes', { count: session.joinedMinutes })}`
                          }`
                        : '—'}
                    </TableCell>
                    <TableCell>{session.reportSubmitted ? t('teacherPage.reportDone') : t('teacherPage.reportMissing')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
