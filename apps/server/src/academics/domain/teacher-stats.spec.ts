import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import { computeTeacherStats } from './teacher-stats';

const now = new Date('2026-10-20T00:00:00Z');
const day = (n: number, h = 10) => new Date(`2026-10-${String(n).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`);
const session = (n: number, over: Record<string, unknown> = {}) => ({
  _id: `s${n}`,
  status: SessionStatus.COMPLETED,
  startsAt: day(n),
  endsAt: day(n, 11),
  teacherAttendance: AttendanceStatus.PRESENT as AttendanceStatus | null,
  report: { submittedAt: day(n, 12) } as { submittedAt: Date } | null,
  ...over,
});

describe('computeTeacherStats', () => {
  it('counts sessions by outcome and treats an ended SCHEDULED session as a missing report', () => {
    const stats = computeTeacherStats(
      [
        session(1),
        session(2, { status: SessionStatus.CANCELLED, report: null, teacherAttendance: null }),
        session(3, { status: SessionStatus.REPORT_PENDING, report: null }),
        session(4, { status: SessionStatus.SCHEDULED, report: null }), // ended in the past: derived REPORT_PENDING
        session(25, { status: SessionStatus.SCHEDULED, report: null, teacherAttendance: null }), // future
      ],
      [],
      now
    );
    expect(stats).toMatchObject({ total: 5, completed: 1, cancelled: 1, reportsMissing: 2 });
  });

  it('tallies teacher attendance over held sessions only, with UNRECORDED for gaps', () => {
    const stats = computeTeacherStats(
      [
        session(1, { teacherAttendance: AttendanceStatus.PRESENT }),
        session(2, { teacherAttendance: AttendanceStatus.LATE }),
        session(3, { teacherAttendance: AttendanceStatus.ABSENT }),
        session(4, { teacherAttendance: null }),
        session(5, { status: SessionStatus.CANCELLED, teacherAttendance: AttendanceStatus.ABSENT }),
        session(25, { status: SessionStatus.SCHEDULED, teacherAttendance: null }),
      ],
      [],
      now
    );
    expect(stats.attendance).toEqual({ PRESENT: 1, LATE: 1, EXCUSED: 0, ABSENT: 1, UNRECORDED: 1 });
  });

  it('averages how long after the start the teacher joined (early joins count as 0) and has null with no joins', () => {
    const sessions = [session(1), session(2), session(3)];
    expect(computeTeacherStats(sessions, [], now).avgJoinDelayMinutes).toBeNull();
    const stats = computeTeacherStats(
      sessions,
      [
        { sessionId: 's1', firstJoinedAt: new Date(day(1).getTime() + 4 * 60_000) },
        { sessionId: 's2', firstJoinedAt: new Date(day(2).getTime() + 8 * 60_000) },
        { sessionId: 's3', firstJoinedAt: new Date(day(3).getTime() - 5 * 60_000) },
      ],
      now
    );
    expect(stats.avgJoinDelayMinutes).toBe(4); // (4 + 8 + 0) / 3
  });

  it('averages the hours between a session ending and its report, null when none was submitted', () => {
    expect(computeTeacherStats([session(1, { report: null })], [], now).avgReportDelayHours).toBeNull();
    const stats = computeTeacherStats([session(1, { report: { submittedAt: day(1, 12) } }), session(2, { report: { submittedAt: day(2, 15) } })], [], now);
    expect(stats.avgReportDelayHours).toBe(2.5); // (1h + 4h) / 2 after the 11:00 end
  });

  it('counts a report submitted before the session ended as no delay, never a negative one', () => {
    const early = computeTeacherStats([session(1, { report: { submittedAt: day(1, 10) } })], [], now); // submitted at 10:00, session ends 11:00
    expect(early.avgReportDelayHours).toBe(0);
  });
});
