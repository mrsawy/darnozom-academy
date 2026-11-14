import { AttendanceStatus } from '@darnozom/shared-types';

export interface AttendanceSummary extends Record<AttendanceStatus, number> {
  marked: number;
  /** (present + late) / marked, or null when nobody was marked. */
  rate: number | null;
}

export function summarizeAttendance(rows: { status: AttendanceStatus }[]): AttendanceSummary {
  const summary = { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0, marked: rows.length, rate: null } as AttendanceSummary;
  for (const row of rows) summary[row.status] += 1;
  summary.rate = rows.length === 0 ? null : (summary.PRESENT + summary.LATE) / rows.length;
  return summary;
}
