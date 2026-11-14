import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';

export interface MatrixSessionInput {
  _id: unknown;
  sequence: number;
  startsAt: Date;
  endsAt: Date;
  status: SessionStatus;
  teacherAttendance?: AttendanceStatus | null;
  attendance: { studentId: unknown; status: AttendanceStatus }[];
}

export interface AttendanceMatrix {
  sessions: { id: string; sequence: number; startsAt: Date; status: SessionStatus; teacherAttendance: AttendanceStatus | null }[];
  students: { studentId: string; name: string; cells: Record<string, AttendanceStatus | null>; attendedRate: number | null }[];
  teacherAttendedRate: number | null;
}

const attended = (status: AttendanceStatus | null | undefined) => status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE;

/** Students x sessions. A rate is attended / held sessions, where held = already ended and not cancelled; null before any session is held. */
export function buildAttendanceMatrix(sessions: MatrixSessionInput[], students: { id: string; name: string }[], now: Date): AttendanceMatrix {
  const ordered = [...sessions].sort((a, b) => a.sequence - b.sequence);
  const held = ordered.filter((s) => s.status !== SessionStatus.CANCELLED && s.endsAt.getTime() <= now.getTime());
  const rate = (hits: number) => (held.length === 0 ? null : hits / held.length);

  return {
    sessions: ordered.map((s) => ({ id: String(s._id), sequence: s.sequence, startsAt: s.startsAt, status: s.status, teacherAttendance: s.teacherAttendance ?? null })),
    students: students.map(({ id, name }) => {
      const statusIn = (s: MatrixSessionInput) => s.attendance.find((row) => String(row.studentId) === id)?.status ?? null;
      return {
        studentId: id,
        name,
        cells: Object.fromEntries(ordered.map((s) => [String(s._id), statusIn(s)])),
        attendedRate: rate(held.filter((s) => attended(statusIn(s))).length),
      };
    }),
    teacherAttendedRate: rate(held.filter((s) => attended(s.teacherAttendance)).length),
  };
}
