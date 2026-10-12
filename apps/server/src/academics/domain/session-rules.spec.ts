/* eslint-disable unicorn/consistent-function-scoping -- small per-describe test builders */
import { AcademicsErrors, AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import {
  checkAttendanceWindow,
  checkReportEditable,
  checkReportOpen,
  effectiveSessionStatus,
  missingAttendance,
  redactSession,
  statusFilterFor,
  validateEvaluations,
} from './session-rules';

const T0 = new Date('2026-10-12T14:00:00.000Z');
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);
const hours = (n: number) => minutes(n * 60);

describe('effectiveSessionStatus', () => {
  const session = (status: SessionStatus) => ({ status, endsAt: minutes(60) });
  it('turns SCHEDULED into REPORT_PENDING once the session has ended', () => {
    expect(effectiveSessionStatus(session(SessionStatus.SCHEDULED), minutes(59))).toBe(SessionStatus.SCHEDULED);
    expect(effectiveSessionStatus(session(SessionStatus.SCHEDULED), minutes(60))).toBe(SessionStatus.REPORT_PENDING);
  });
  it('leaves every other status alone', () => {
    for (const status of [SessionStatus.REPORT_PENDING, SessionStatus.COMPLETED, SessionStatus.CANCELLED]) {
      expect(effectiveSessionStatus(session(status), hours(5))).toBe(status);
    }
  });
});

describe('checkAttendanceWindow', () => {
  const session = (status = SessionStatus.SCHEDULED) => ({ status, startsAt: T0 });
  it('opens exactly 15 minutes before the start', () => {
    expect(checkAttendanceWindow(session(), minutes(-16))).toBe(AcademicsErrors.ATTENDANCE_NOT_OPEN);
    expect(checkAttendanceWindow(session(), minutes(-15))).toBeNull();
    expect(checkAttendanceWindow(session(SessionStatus.REPORT_PENDING), hours(3))).toBeNull();
  });
  it('is closed once the report is submitted or the session is cancelled', () => {
    expect(checkAttendanceWindow(session(SessionStatus.COMPLETED), minutes(10))).toBe(AcademicsErrors.ATTENDANCE_CLOSED);
    expect(checkAttendanceWindow(session(SessionStatus.CANCELLED), minutes(10))).toBe(AcademicsErrors.ATTENDANCE_CLOSED);
  });
});

describe('checkReportOpen', () => {
  const session = (status = SessionStatus.SCHEDULED) => ({ status, startsAt: T0 });
  it('is not open before the session starts', () => {
    expect(checkReportOpen(session(), minutes(-1))).toBe(AcademicsErrors.REPORT_NOT_OPEN);
    expect(checkReportOpen(session(), minutes(0))).toBeNull();
    expect(checkReportOpen(session(SessionStatus.REPORT_PENDING), hours(2))).toBeNull();
  });
  it('rejects a second submission and a cancelled session', () => {
    expect(checkReportOpen(session(SessionStatus.COMPLETED), hours(2))).toBe(AcademicsErrors.REPORT_ALREADY_SUBMITTED);
    expect(checkReportOpen(session(SessionStatus.CANCELLED), hours(2))).toBe(AcademicsErrors.REPORT_NOT_OPEN);
  });
});

describe('checkReportEditable', () => {
  const done = { status: SessionStatus.COMPLETED, report: { submittedAt: T0 } };
  it('allows edits for 24 hours after submission', () => {
    expect(checkReportEditable(done, hours(24))).toBeNull();
    expect(checkReportEditable(done, new Date(hours(24).getTime() + 1))).toBe(AcademicsErrors.REPORT_EDIT_WINDOW_CLOSED);
  });
  it('needs a submitted report', () => {
    expect(checkReportEditable({ status: SessionStatus.REPORT_PENDING, report: null }, hours(1))).toBe(AcademicsErrors.REPORT_NOT_SUBMITTED);
  });
});

describe('missingAttendance', () => {
  it('lists required students without an attendance row', () => {
    expect(missingAttendance(['a', 'b', 'c'], [{ studentId: 'a' }, { studentId: 'c' }])).toEqual(['b']);
    expect(missingAttendance([], [])).toEqual([]);
  });
});

describe('validateEvaluations', () => {
  const ev = (studentId: string, score = 4) => ({ studentId, participation: score, understanding: score, behavior: score, homework: score });
  it('accepts one in-range evaluation per required student', () => {
    expect(validateEvaluations(['a', 'b'], ['a', 'b'], [ev('a'), ev('b', 1)])).toBeNull();
  });
  it('rejects missing, duplicate, unknown and out-of-range evaluations', () => {
    expect(validateEvaluations(['a', 'b'], ['a', 'b'], [ev('a')])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a'), ev('a')])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a'), ev('z')])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a', 0)])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a', 6)])).toBe(AcademicsErrors.REPORT_INVALID);
    expect(validateEvaluations(['a'], ['a'], [ev('a', 3.5)])).toBe(AcademicsErrors.REPORT_INVALID);
  });
  it('does not require withdrawn students but tolerates their existing evaluation', () => {
    expect(validateEvaluations(['a'], ['a', 'w'], [ev('a'), ev('w')])).toBeNull();
    expect(validateEvaluations(['a'], ['a', 'w'], [ev('a')])).toBeNull();
  });
});

describe('statusFilterFor', () => {
  it('maps the derived statuses to stored fields', () => {
    expect(statusFilterFor(SessionStatus.SCHEDULED, T0)).toEqual({ status: SessionStatus.SCHEDULED, endsAt: { $gt: T0 } });
    expect(statusFilterFor(SessionStatus.REPORT_PENDING, T0)).toEqual({
      $or: [{ status: SessionStatus.REPORT_PENDING }, { status: SessionStatus.SCHEDULED, endsAt: { $lte: T0 } }],
    });
    expect(statusFilterFor(SessionStatus.COMPLETED, T0)).toEqual({ status: SessionStatus.COMPLETED });
  });
});

describe('redactSession', () => {
  const base = {
    teacherAttendance: AttendanceStatus.PRESENT,
    attendance: [
      { studentId: 'a', status: AttendanceStatus.PRESENT, note: 'late bus' },
      { studentId: 'b', status: AttendanceStatus.ABSENT, note: 'sick' },
    ],
    report: {
      evaluations: [
        { studentId: 'a', participation: 5, understanding: 4, behavior: 5, homework: 3, note: 'great' },
        { studentId: 'b', participation: 1, understanding: 1, behavior: 1, homework: 1, note: 'struggling' },
      ],
      summary: 'whole-class summary',
      submittedBy: 't1',
      submittedAt: T0,
    },
  };

  it('returns staff views untouched', () => {
    expect(redactSession(base, 'STAFF', null)).toEqual(base);
  });

  it("keeps only the family's own child and drops the class summary", () => {
    const view = redactSession(base, 'FAMILY', ['a']);
    expect(view.attendance.map((a) => a.studentId)).toEqual(['a']);
    expect(view.report?.evaluations.map((e) => e.studentId)).toEqual(['a']);
    expect(view.report?.summary).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain('struggling');
    expect(JSON.stringify(view)).not.toContain('sick');
  });

  it('gives accountants attendance without notes and no evaluations', () => {
    const view = redactSession(base, 'ACCOUNTANT', null);
    expect(view.attendance.map((a) => a.studentId)).toEqual(['a', 'b']);
    expect(view.attendance.every((a) => a.note === undefined)).toBe(true);
    expect(view.report).toEqual({ evaluations: [], submittedBy: 't1', submittedAt: T0 });
  });

  it('copes with a session that has no report yet', () => {
    expect(redactSession({ ...base, report: null }, 'FAMILY', ['a']).report).toBeNull();
  });
});
