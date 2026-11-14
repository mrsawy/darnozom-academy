import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import { effectiveSessionStatus } from './session-rules';

export interface TeacherStatsSession {
  _id: unknown;
  status: SessionStatus;
  startsAt: Date;
  endsAt: Date;
  teacherAttendance?: AttendanceStatus | null;
  report?: { submittedAt: Date } | null;
}

export interface TeacherStats {
  total: number;
  completed: number;
  cancelled: number;
  /** Sessions that ended without a submitted report. */
  reportsMissing: number;
  /** Teacher attendance over held sessions (ended, not cancelled); UNRECORDED when nobody marked it. */
  attendance: Record<AttendanceStatus | 'UNRECORDED', number>;
  /** Average minutes after the start that the teacher first joined through the platform (early = 0); null when never joined. */
  avgJoinDelayMinutes: number | null;
  /** Average hours between a session ending and its report; null when no report exists. */
  avgReportDelayHours: number | null;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const average = (values: number[]) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

export function computeTeacherStats(sessions: TeacherStatsSession[], presence: { sessionId: unknown; firstJoinedAt: Date }[], now: Date): TeacherStats {
  const effective = sessions.map((session) => ({ session, status: effectiveSessionStatus(session, now) }));
  const held = effective.filter(({ session, status }) => status !== SessionStatus.CANCELLED && session.endsAt.getTime() <= now.getTime());

  const attendance = { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0, UNRECORDED: 0 } as TeacherStats['attendance'];
  for (const { session } of held) attendance[session.teacherAttendance ?? 'UNRECORDED'] += 1;

  const startOf = new Map(sessions.map((session) => [String(session._id), session.startsAt.getTime()]));
  const joinDelays = presence
    .filter((row) => startOf.has(String(row.sessionId)))
    .map((row) => Math.max(0, (row.firstJoinedAt.getTime() - (startOf.get(String(row.sessionId)) as number)) / MINUTE_MS));

  const reportDelays = sessions.filter((s) => s.report).map((s) => Math.max(0, ((s.report as { submittedAt: Date }).submittedAt.getTime() - s.endsAt.getTime()) / HOUR_MS));

  return {
    total: sessions.length,
    completed: effective.filter(({ status }) => status === SessionStatus.COMPLETED).length,
    cancelled: effective.filter(({ status }) => status === SessionStatus.CANCELLED).length,
    reportsMissing: effective.filter(({ status }) => status === SessionStatus.REPORT_PENDING).length,
    attendance,
    avgJoinDelayMinutes: average(joinDelays),
    avgReportDelayHours: average(reportDelays),
  };
}
