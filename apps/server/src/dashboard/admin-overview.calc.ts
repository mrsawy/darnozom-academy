import { AttendanceStatus } from '@darnozom/shared-types';

export interface OverviewSession {
  groupId: string;
  teacherId: string;
  attendance: { studentId: string; status: AttendanceStatus }[];
  evaluations: {
    studentId: string;
    participation: number;
    understanding: number;
    behavior: number;
    homework: number;
  }[];
}

interface Tally {
  attended: number;
  counted: number;
  scoreSum: number;
  scoreCount: number;
}

const newTally = (): Tally => ({ attended: 0, counted: 0, scoreSum: 0, scoreCount: 0 });

const round1 = (n: number) => Math.round(n * 10) / 10;

export const rate = (t: Tally): number | null =>
  t.counted === 0 ? null : Math.round((t.attended / t.counted) * 100);

export const avg = (t: Tally): number | null =>
  t.scoreCount === 0 ? null : round1(t.scoreSum / t.scoreCount);

function addAttendance(t: Tally, status: AttendanceStatus) {
  // Excused absences are neither credit nor blame.
  if (status === AttendanceStatus.EXCUSED) return;
  t.counted += 1;
  if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) t.attended += 1;
}

const evalScore = (e: OverviewSession['evaluations'][number]) =>
  (e.participation + e.understanding + e.behavior + e.homework) / 4;

/** Aggregates attendance and report scores per teacher, student and group. */
export function tallySessions(sessions: OverviewSession[]) {
  const byTeacher = new Map<string, Tally>();
  const byStudent = new Map<string, Tally>();
  const byGroup = new Map<string, Tally>();
  const get = (m: Map<string, Tally>, k: string) => {
    let t = m.get(k);
    if (!t) m.set(k, (t = newTally()));
    return t;
  };

  for (const s of sessions) {
    for (const a of s.attendance) {
      addAttendance(get(byTeacher, s.teacherId), a.status);
      addAttendance(get(byStudent, a.studentId), a.status);
      addAttendance(get(byGroup, s.groupId), a.status);
    }
    for (const e of s.evaluations) {
      const score = evalScore(e);
      for (const t of [get(byTeacher, s.teacherId), get(byStudent, e.studentId)]) {
        t.scoreSum += score;
        t.scoreCount += 1;
      }
    }
  }
  return { byTeacher, byStudent, byGroup };
}

/**
 * Splits scored items into a best and a worst list that never overlap
 * (so with few items the same person is not both "best" and "worst").
 */
export function topAndBottom<T extends { avgScore: number | null; attendanceRate: number | null }>(
  items: T[],
  size: number
): { top: T[]; bottom: T[] } {
  const scored = items
    .filter((i) => i.avgScore !== null)
    .sort(
      (a, b) =>
        (b.avgScore as number) - (a.avgScore as number) ||
        (b.attendanceRate ?? 0) - (a.attendanceRate ?? 0)
    );
  const top = scored.slice(0, size);
  const bottom = scored.slice(top.length).slice(-size).reverse();
  return { top, bottom };
}
