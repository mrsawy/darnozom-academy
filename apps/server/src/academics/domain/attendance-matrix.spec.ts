import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import { buildAttendanceMatrix } from './attendance-matrix';

const now = new Date('2026-10-20T00:00:00Z');
const session = (n: number, over: Record<string, unknown> = {}) => ({
  _id: `s${n}`,
  sequence: n,
  startsAt: new Date(`2026-10-0${n}T10:00:00Z`),
  endsAt: new Date(`2026-10-0${n}T11:00:00Z`),
  status: SessionStatus.COMPLETED,
  teacherAttendance: AttendanceStatus.PRESENT,
  attendance: [] as { studentId: unknown; status: AttendanceStatus }[],
  ...over,
});
const students = [
  { id: 'a', name: 'Amal' },
  { id: 'b', name: 'Bilal' },
];

describe('buildAttendanceMatrix', () => {
  it('puts each student status in the cell of its session and null where nothing was recorded', () => {
    const result = buildAttendanceMatrix(
      [
        session(1, { attendance: [{ studentId: 'a', status: AttendanceStatus.PRESENT }, { studentId: 'b', status: AttendanceStatus.ABSENT }] }),
        session(2, { attendance: [{ studentId: 'a', status: AttendanceStatus.LATE }] }),
      ],
      students,
      now
    );
    expect(result.sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(result.students[0].cells).toEqual({ s1: AttendanceStatus.PRESENT, s2: AttendanceStatus.LATE });
    expect(result.students[1].cells).toEqual({ s1: AttendanceStatus.ABSENT, s2: null });
  });

  it('counts PRESENT and LATE as attended, over held sessions only (past and not cancelled)', () => {
    const result = buildAttendanceMatrix(
      [
        session(1, { attendance: [{ studentId: 'a', status: AttendanceStatus.PRESENT }] }),
        session(2, { attendance: [{ studentId: 'a', status: AttendanceStatus.ABSENT }] }),
        session(3, { status: SessionStatus.CANCELLED, attendance: [] }),
        session(4, { status: SessionStatus.SCHEDULED, startsAt: new Date('2026-12-01T10:00:00Z'), endsAt: new Date('2026-12-01T11:00:00Z') }),
      ],
      students,
      now
    );
    expect(result.students[0].attendedRate).toBe(0.5);
    expect(result.students[1].attendedRate).toBe(0);
  });

  it('has no rate when no session has been held yet, and rates the teacher the same way', () => {
    const future = session(1, { status: SessionStatus.SCHEDULED, startsAt: new Date('2026-12-01T10:00:00Z'), endsAt: new Date('2026-12-01T11:00:00Z'), teacherAttendance: null });
    expect(buildAttendanceMatrix([future], students, now).students[0].attendedRate).toBeNull();
    expect(buildAttendanceMatrix([future], students, now).teacherAttendedRate).toBeNull();

    const result = buildAttendanceMatrix([session(1), session(2, { teacherAttendance: AttendanceStatus.ABSENT })], students, now);
    expect(result.teacherAttendedRate).toBe(0.5);
  });

  it('orders sessions by sequence', () => {
    const result = buildAttendanceMatrix([session(2), session(1)], students, now);
    expect(result.sessions.map((s) => s.sequence)).toEqual([1, 2]);
  });
});
