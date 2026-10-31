'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AttendanceStatus,
  GROUP_EDITOR_ROLES,
  hasAnyRole,
  REPORT_EDIT_WINDOW_HOURS,
  Roles,
  SessionStatus,
} from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { SessionDisputeModal } from '@/components/organs/payroll/session-dispute-modal';
import {
  useCancelSession,
  useEditReport,
  useMarkAttendance,
  useMarkTeacherAttendance,
  useSession,
  useSubmitReport,
} from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { formatSessionTime } from '@/lib/utils/academics/session-time';
import { RescheduleSessionDialog } from '../../../academics/groups/[id]/__components/reschedule-session-dialog';
import { useRouter } from '@/i18n/navigation';
import { useDeleteSession, useRescheduleSession } from '@/lib/hooks/academics/use-academics.hook';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { AttendanceTable } from './attendance-table';
import { ReportForm } from './report-form';
import { ReportView } from './report-view';

const HOUR_MS = 60 * 60 * 1000;

export function SessionDetailScreen({ sessionId }: { sessionId: string }) {
  const t = useTranslations('Academics');
  const tPayroll = useTranslations('Payroll');
  const locale = useLocale();
  const { data: session, isLoading } = useSession(sessionId);
  const { data: user } = useAuthUser();
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const markAttendance = useMarkAttendance();
  const markTeacher = useMarkTeacherAttendance();
  const submitReport = useSubmitReport();
  const editReport = useEditReport();
  const cancelSession = useCancelSession();
  const rescheduleSession = useRescheduleSession();
  const deleteSession = useDeleteSession();
  const router = useRouter();

  if (isLoading || !session) return <p className="p-4">{t('loading')}</p>;

  const now = Date.now();
  const isTeacher = !!user && session.teacherId === user._id;
  const canManage = hasAnyRole(user, GROUP_EDITOR_ROLES);
  const canDispute = hasAnyRole(user, [
    Roles.OWNER,
    Roles.MANAGER,
    Roles.ADMIN,
    Roles.SUPER_ADMIN,
    Roles.ACCOUNTANT,
    Roles.SUPERVISOR,
  ]);
  const closed =
    session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED;
  const started = now >= new Date(session.startsAt).getTime();
  const attendanceComplete = session.roster.every((studentId) =>
    session.attendance.some((entry) => entry.studentId === studentId)
  );
  const report = session.report;
  const editable =
    !!report &&
    isTeacher &&
    now - new Date(report.submittedAt).getTime() <= REPORT_EDIT_WINDOW_HOURS * HOUR_MS;
  const canSubmit = isTeacher && !report && started && !closed;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {t('sessions.detailTitle', { number: session.sequence })}
          </h1>
          <p className="text-muted-foreground">
            {session.groupName ? `${session.groupName} — ` : ''}
            {formatSessionTime(session.startsAt, locale)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SessionStatusBadge status={session.status} />
          {session.disputed ? (
            <Badge
              variant="destructive"
              className="cursor-pointer"
              onClick={() => setDisputeModalOpen(true)}
            >
              {tPayroll('disputedBadge')}
            </Badge>
          ) : null}
          {canDispute && session.status === SessionStatus.COMPLETED && !session.disputed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisputeModalOpen(true)}
            >
              {tPayroll('dispute')}
            </Button>
          ) : null}
          {canManage && session.status === SessionStatus.SCHEDULED ? (
            <>
              <RescheduleSessionDialog
                session={session}
                pending={rescheduleSession.isPending}
                onConfirm={(startsAt, endsAt) =>
                  rescheduleSession.mutate({ id: session._id, startsAt, endsAt })
                }
              />
              <CancelSessionDialog
                pending={cancelSession.isPending}
                onConfirm={(reason) => cancelSession.mutate({ id: session._id, reason })}
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteSession.isPending}
                onClick={() => {
                  if (window.confirm(t('sessions.deleteConfirm'))) {
                    deleteSession.mutate(session._id, {
                      onSuccess: () => router.push(ROUTE_ORG_ACADEMICS_GROUP(session.groupId)),
                    });
                  }
                }}>
                {t('sessions.delete')}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('sessions.attendance.teacher')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {Object.values(AttendanceStatus).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={session.teacherAttendance === status ? 'default' : 'outline'}
                aria-pressed={session.teacherAttendance === status}
                disabled={session.status === SessionStatus.CANCELLED || markTeacher.isPending}
                onClick={() => markTeacher.mutate({ id: session._id, status })}>
                {t(`sessions.attendance.statuses.${status}`)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('sessions.attendance.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {closed ? (
            <p className="text-muted-foreground mb-3 text-sm">{t('sessions.attendance.locked')}</p>
          ) : null}
          <AttendanceTable
            key={session.attendance.length}
            roster={session.roster}
            people={session.people}
            attendance={session.attendance}
            disabled={closed || !(isTeacher || canManage)}
            pending={markAttendance.isPending}
            onSave={(entries) => markAttendance.mutate({ id: session._id, entries })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('sessions.report.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canSubmit ? (
            <>
              {attendanceComplete ? null : (
                <p className="text-muted-foreground text-sm">
                  {t('sessions.report.pendingAttendance')}
                </p>
              )}
              <ReportForm
                roster={session.roster}
                people={session.people}
                disabled={!attendanceComplete}
                pending={submitReport.isPending}
                submitLabel={t('sessions.report.submit')}
                onSubmit={(data) => submitReport.mutate({ id: session._id, data })}
              />
            </>
          ) : report && editable ? (
            <>
              <p className="text-muted-foreground text-sm">{t('sessions.report.editHint')}</p>
              <ReportForm
                key={report.submittedAt}
                roster={session.roster}
                people={session.people}
                initial={report}
                disabled={false}
                pending={editReport.isPending}
                submitLabel={t('sessions.report.saveChanges')}
                onSubmit={(data) => editReport.mutate({ id: session._id, data })}
              />
            </>
          ) : report ? (
            <ReportView report={report} people={session.people} />
          ) : (
            <p className="text-muted-foreground">{t('sessions.report.empty')}</p>
          )}
        </CardContent>
      </Card>

      <SessionDisputeModal
        open={disputeModalOpen}
        onOpenChange={setDisputeModalOpen}
        session={session}
        canManageDispute={canDispute}
      />
    </div>
  );
}
