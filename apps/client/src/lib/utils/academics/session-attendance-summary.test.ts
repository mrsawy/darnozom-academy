import { describe, expect, it } from 'vitest';
import { AttendanceStatus } from '@darnozom/shared-types';
import { summarizeAttendance } from './session-attendance-summary';

const row = (status: AttendanceStatus) => ({ studentId: String(Math.random()), status });

describe('summarizeAttendance', () => {
  it('counts each status and the marked total', () => {
    const summary = summarizeAttendance([
      row(AttendanceStatus.PRESENT),
      row(AttendanceStatus.PRESENT),
      row(AttendanceStatus.LATE),
      row(AttendanceStatus.ABSENT),
      row(AttendanceStatus.EXCUSED),
    ]);
    expect(summary).toMatchObject({ PRESENT: 2, LATE: 1, EXCUSED: 1, ABSENT: 1, marked: 5 });
  });

  it('rate counts present and late over everyone marked', () => {
    const rows = [row(AttendanceStatus.PRESENT), row(AttendanceStatus.LATE), row(AttendanceStatus.ABSENT), row(AttendanceStatus.ABSENT)];
    expect(summarizeAttendance(rows).rate).toBe(0.5);
  });

  it('has no rate, not zero, when nobody was marked', () => {
    expect(summarizeAttendance([])).toMatchObject({ marked: 0, rate: null });
  });
});
