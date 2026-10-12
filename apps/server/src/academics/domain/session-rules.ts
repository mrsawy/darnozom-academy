import {
  AcademicsErrors,
  ATTENDANCE_OPEN_MINUTES_BEFORE,
  AttendanceStatus,
  REPORT_EDIT_WINDOW_HOURS,
  SESSION_SCORE_MAX,
  SESSION_SCORE_MIN,
  SessionStatus,
} from '@darnozom/shared-types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** SCHEDULED becomes REPORT_PENDING by itself once the session has ended (also persisted by the sweep job). */
export function effectiveSessionStatus(session: { status: SessionStatus; endsAt: Date }, now: Date): SessionStatus {
  return session.status === SessionStatus.SCHEDULED && session.endsAt.getTime() <= now.getTime() ? SessionStatus.REPORT_PENDING : session.status;
}

/** Attendance is open from 15 minutes before the start until the report is submitted. */
export function checkAttendanceWindow(session: { status: SessionStatus; startsAt: Date }, now: Date): AcademicsErrors | null {
  if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED) return AcademicsErrors.ATTENDANCE_CLOSED;
  if (now.getTime() < session.startsAt.getTime() - ATTENDANCE_OPEN_MINUTES_BEFORE * MINUTE_MS) return AcademicsErrors.ATTENDANCE_NOT_OPEN;
  return null;
}

/** A report can be submitted once the session has started, exactly once. */
export function checkReportOpen(session: { status: SessionStatus; startsAt: Date }, now: Date): AcademicsErrors | null {
  if (session.status === SessionStatus.COMPLETED) return AcademicsErrors.REPORT_ALREADY_SUBMITTED;
  if (session.status === SessionStatus.CANCELLED) return AcademicsErrors.REPORT_NOT_OPEN;
  if (now.getTime() < session.startsAt.getTime()) return AcademicsErrors.REPORT_NOT_OPEN;
  return null;
}

export function checkReportEditable(session: { status: SessionStatus; report?: { submittedAt: Date } | null }, now: Date): AcademicsErrors | null {
  if (session.status !== SessionStatus.COMPLETED || !session.report) return AcademicsErrors.REPORT_NOT_SUBMITTED;
  return now.getTime() - session.report.submittedAt.getTime() > REPORT_EDIT_WINDOW_HOURS * HOUR_MS ? AcademicsErrors.REPORT_EDIT_WINDOW_CLOSED : null;
}

export function missingAttendance(requiredIds: string[], attendance: { studentId: unknown }[]): string[] {
  const marked = new Set(attendance.map((entry) => String(entry.studentId)));
  return requiredIds.filter((id) => !marked.has(id));
}

export interface EvaluationInput {
  studentId: string;
  participation: number;
  understanding: number;
  behavior: number;
  homework: number;
}

const isScore = (value: unknown): boolean =>
  Number.isInteger(value) && (value as number) >= SESSION_SCORE_MIN && (value as number) <= SESSION_SCORE_MAX;

/** One evaluation per required student; every id must be allowed; no duplicates; scores are integers 1–5. */
export function validateEvaluations(requiredIds: string[], allowedIds: string[], evaluations: EvaluationInput[]): AcademicsErrors | null {
  const seen = new Set<string>();
  for (const evaluation of evaluations) {
    if (seen.has(evaluation.studentId) || !allowedIds.includes(evaluation.studentId)) return AcademicsErrors.REPORT_INVALID;
    seen.add(evaluation.studentId);
    if (![evaluation.participation, evaluation.understanding, evaluation.behavior, evaluation.homework].every((score) => isScore(score))) {
      return AcademicsErrors.REPORT_INVALID;
    }
  }
  return requiredIds.every((id) => seen.has(id)) ? null : AcademicsErrors.REPORT_INVALID;
}

/** Query fragment for a status filter that matches the derived (effective) status. */
export function statusFilterFor(status: SessionStatus, now: Date): Record<string, unknown> {
  switch (status) {
    case SessionStatus.SCHEDULED: {
      return { status: SessionStatus.SCHEDULED, endsAt: { $gt: now } };
    }
    case SessionStatus.REPORT_PENDING: {
      return { $or: [{ status: SessionStatus.REPORT_PENDING }, { status: SessionStatus.SCHEDULED, endsAt: { $lte: now } }] };
    }
    default: {
      return { status };
    }
  }
}

export type SessionAudience = 'STAFF' | 'ACCOUNTANT' | 'FAMILY';

export interface RedactableSession {
  teacherAttendance?: AttendanceStatus | null;
  attendance: { studentId: unknown; status: AttendanceStatus; note?: string }[];
  report?: {
    evaluations: { studentId: unknown; note?: string }[];
    summary?: string;
    submittedBy: unknown;
    submittedAt: Date;
  } | null;
}

/**
 * STAFF sees everything. FAMILY sees only visibleStudentIds' rows and never the class summary.
 * ACCOUNTANT sees attendance (no notes) and no evaluations ("accountants can't see confidential pedagogical notes").
 */
export function redactSession<T extends RedactableSession>(session: T, audience: SessionAudience, visibleStudentIds: string[] | null): T {
  if (audience === 'STAFF' && !visibleStudentIds) return session;
  if (audience === 'ACCOUNTANT') {
    return {
      ...session,

      attendance: session.attendance.map(({ note: _note, ...rest }) => rest),
      report: session.report ? { evaluations: [], submittedBy: session.report.submittedBy, submittedAt: session.report.submittedAt } : session.report,
    };
  }
  const visible = (studentId: unknown) => !visibleStudentIds || visibleStudentIds.includes(String(studentId));
  return {
    ...session,
    attendance: session.attendance.filter((entry) => visible(entry.studentId)),
    report: session.report
      ? {
          evaluations: session.report.evaluations.filter((entry) => visible(entry.studentId)),
          submittedBy: session.report.submittedBy,
          submittedAt: session.report.submittedAt,
        }
      : session.report,
  };
}
