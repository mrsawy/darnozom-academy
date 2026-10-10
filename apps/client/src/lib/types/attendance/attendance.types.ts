export { AttendanceStatus } from '@lms-organization/shared-types';
import { AttendanceStatus } from '@lms-organization/shared-types';
export type {
  StudentSessionHistoryRow,
  StudentCourseHistorySummary,
  StudentCourseHistory,
  StudentScheduledCourse,
} from '@lms-organization/shared-types';

export interface Attendance {
  _id: string;
  date: string;
  courseId: string;
  slotId: string;
  studentId:
    | string
    | { _id: string; firstName: string; lastName: string; email: string; avatar?: string };
  organizationId: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: AttendanceStatus | null;
  notes?: string;
  derivedAbsent: boolean;
}

export interface PaginatedSessionRoster {
  items: SessionRosterEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarkAttendanceInput {
  date: Date;
  courseId: string;
  slotId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface GetAttendanceBySessionInput {
  courseId: string;
  slotId: string;
  date: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetAttendanceByDateInput {
  courseId: string;
  date: string;
}

export interface GetStudentAttendanceInput {
  studentId: string;
  courseId: string;
}

export interface ClearAttendanceInput {
  courseId: string;
  slotId: string;
  studentId: string;
  date: string;
}

export interface StudentReportRow {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  expectedSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceReportData {
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalLate: number;
    totalExcused: number;
    totalAbsent: number;
  };
  students: StudentReportRow[];
}
