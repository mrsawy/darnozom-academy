'use client';

import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { AttendanceStatus, GroupStatus, SessionStatus } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { ROUTE_STUDENT_MY_GROUPS } from '@/lib/data/constants/routes.constants';
import { useGroup, useSessions } from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { safeHref } from '@/lib/utils/academics/safe-href';
import { formatSessionTime } from '@/lib/utils/academics/session-time';

const STATUS_VARIANT: Record<GroupStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [GroupStatus.FORMING]: 'secondary',
  [GroupStatus.READY_TO_START]: 'default',
  [GroupStatus.RUNNING]: 'default',
  [GroupStatus.COMPLETED]: 'secondary',
  [GroupStatus.CANCELLED]: 'destructive',
};

const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: 'text-green-600 font-medium',
  [AttendanceStatus.LATE]: 'text-yellow-600 font-medium',
  [AttendanceStatus.EXCUSED]: 'text-blue-600 font-medium',
  [AttendanceStatus.ABSENT]: 'text-red-600 font-medium',
};

export default function StudentGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Academics');
  const locale = useLocale();

  const { data: user } = useAuthUser();
  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(
    { groupId: id },
    !!id
  );

  if (groupLoading || !group) {
    return <p className="p-6">{t('loading')}</p>;
  }

  const teacherName = group.teacherId ? group.people[group.teacherId] : null;
  const scheduleText = group.schedule
    .map((slot) => `${t(`days.${slot.dayOfWeek}`)} ${slot.startTime} (${slot.durationMinutes}′)`)
    .join(' · ');
  const meetingHref = safeHref(group.meetingLink);
  const whatsappHref = safeHref(group.whatsappGroupLink);
  const completedCount = sessions.filter((s) => s.status === SessionStatus.COMPLETED).length;

  /** Find this student's own attendance record for a session. */
  function getMyAttendance(sessionAttendance: { studentId: string; status: AttendanceStatus }[]) {
    if (!user?._id) return null;
    return sessionAttendance.find((a) => a.studentId === user._id) ?? null;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Back link */}
      <Link
        href={ROUTE_STUDENT_MY_GROUPS}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        ← {t('myGroups.title')}
      </Link>

      {/* Title + status */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <Badge variant={STATUS_VARIANT[group.status]}>
          {t(`groups.statuses.${group.status}`)}
        </Badge>
      </div>

      {/* Info cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Schedule card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('form.schedule')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{scheduleText || '—'}</p>
            <p className="text-muted-foreground mt-1 text-xs">{group.timezone}</p>
          </CardContent>
        </Card>

        {/* Teacher card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('groups.teacher')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {teacherName ?? t('groups.noTeacher')}
            </p>
          </CardContent>
        </Card>

        {/* Progress card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('sessions.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {completedCount}
              {sessions.length > 0 ? (
                <span className="text-muted-foreground text-base font-normal">
                  /{sessions.length}
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('students.title')}: {group.students.length}/{group.maxStudents}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Links */}
      {(meetingHref || whatsappHref) ? (
        <div className="flex flex-wrap gap-4">
          {meetingHref ? (
            <a
              href={meetingHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
              {t('form.meetingLink')} ↗
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
              {t('form.whatsappGroupLink')} ↗
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Sessions table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sessions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <p className="text-muted-foreground text-sm">{t('loading')}</p>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('sessions.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('sessions.when')}</TableHead>
                    <TableHead>{t('sessions.status')}</TableHead>
                    <TableHead>{t('sessions.myAttendance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const att = getMyAttendance(session.attendance);
                    return (
                      <TableRow key={session._id}>
                        <TableCell className="font-medium">{session.sequence}</TableCell>
                        <TableCell className="text-sm">
                          {formatSessionTime(session.startsAt, locale, group.timezone)}
                        </TableCell>
                        <TableCell>
                          <SessionStatusBadge status={session.status} />
                        </TableCell>
                        <TableCell>
                          {att ? (
                            <span className={ATTENDANCE_STYLE[att.status]}>
                              {t(`sessions.attendance.statuses.${att.status}`)}
                            </span>
                          ) : session.status === SessionStatus.SCHEDULED ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {t('sessions.notRecorded')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
