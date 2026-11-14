'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AttendanceStatus } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/atoms/table';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';
import { useGroups, useSessions } from '@/lib/hooks/academics/use-academics.hook';
import { summarizeAttendance } from '@/lib/utils/academics/session-attendance-summary';
import { formatSessionTime } from '@/lib/utils/academics/session-time';

const ALL = 'all';
const DAY_MS = 24 * 60 * 60 * 1000;
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

/** Attendance of the group sessions (what was recorded, by hand or automatically), filtered by group and dates. */
export function SessionsAttendanceScreen() {
  const t = useTranslations('Academics');
  const tPage = useTranslations('SessionsAttendance');
  const locale = useLocale();
  const [groupId, setGroupId] = useState(ALL);
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * DAY_MS)));
  const [to, setTo] = useState('');

  const { data: groups = [] } = useGroups({});
  const { data: sessions = [], isLoading } = useSessions({
    ...(groupId === ALL ? {} : { groupId }),
    ...(from ? { from } : {}),
    // `to` is exclusive on the server, so the chosen day is included by adding one.
    ...(to ? { to: toDateInput(new Date(new Date(to).getTime() + DAY_MS)) } : {}),
  });

  const rows = useMemo(() => sessions.map((session) => ({ session, summary: summarizeAttendance(session.attendance) })), [sessions]);
  const totals = useMemo(() => summarizeAttendance(sessions.flatMap((session) => session.attendance)), [sessions]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{tPage('title')}</h1>
        <p className="text-muted-foreground">{tPage('description')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="att-group">{tPage('group')}</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger id="att-group" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tPage('allGroups')}</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group._id} value={group._id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="att-from">{tPage('from')}</Label>
          <Input id="att-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="att-to">{tPage('to')}</Label>
          <Input id="att-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          [tPage('sessions'), sessions.length],
          [t('sessions.attendance.statuses.PRESENT'), totals.PRESENT],
          [t('sessions.attendance.statuses.LATE'), totals.LATE],
          [t('sessions.attendance.statuses.EXCUSED'), totals.EXCUSED],
          [t('sessions.attendance.statuses.ABSENT'), totals.ABSENT],
          [tPage('rate'), totals.rate === null ? '—' : `${Math.round(totals.rate * 100)}%`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-1">
              <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tPage('empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tPage('session')}</TableHead>
                    <TableHead>{t('sessions.when')}</TableHead>
                    <TableHead>{t('sessions.status')}</TableHead>
                    <TableHead>{t('sessions.attendance.teacher')}</TableHead>
                    {Object.values(AttendanceStatus).map((status) => (
                      <TableHead key={status} className="text-center">
                        {t(`sessions.attendance.statuses.${status}`)}
                      </TableHead>
                    ))}
                    <TableHead className="text-end">{tPage('rate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ session, summary }) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        <Link href={ROUTE_ORG_SESSION(session._id)} className="font-medium hover:underline">
                          {session.groupName ?? '—'} · {session.sequence}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{formatSessionTime(session.startsAt, locale)}</TableCell>
                      <TableCell>
                        <SessionStatusBadge status={session.status} />
                      </TableCell>
                      <TableCell>{session.teacherAttendance ? t(`sessions.attendance.statuses.${session.teacherAttendance}`) : '—'}</TableCell>
                      {Object.values(AttendanceStatus).map((status) => (
                        <TableCell key={status} className="text-center">
                          {summary[status]}
                        </TableCell>
                      ))}
                      <TableCell className="text-end">{summary.rate === null ? '—' : `${Math.round(summary.rate * 100)}%`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
