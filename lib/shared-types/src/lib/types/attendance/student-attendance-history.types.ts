import { AttendanceStatus } from './attendance-status.enum';

/** One past session in a student's attendance history. `status` is the recorded status, or ABSENT when the session passed with no record. */
export interface StudentSessionHistoryRow {
  date: string;
  slotId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface StudentCourseHistorySummary {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  /** (present + late) / (total − excused), as a percentage rounded to 2 decimals. */
  attendanceRate: number;
}

/** Paginated session list plus a summary computed across ALL past sessions (not just the current page). */
export interface StudentCourseHistory {
  courseId: string;
  summary: StudentCourseHistorySummary;
  items: StudentSessionHistoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** A course the student is scheduled in (appears in at least one active offline slot roster). */
export interface StudentScheduledCourse {
  courseId: string;
  name: string;
}
