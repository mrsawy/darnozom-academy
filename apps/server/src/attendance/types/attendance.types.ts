import { AttendanceStatus } from '../enum/attendance-status.enum';

export interface BulkAttendanceResult {
  studentId: string;
  status: string;
  data?: import('../entities/attendance.entity').Attendance;
  message?: string;
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

export interface AttendanceReportResult {
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

export interface SessionRosterQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedSessionRoster {
  items: SessionRosterEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExpectedSession {
  slotId: string;
  date: Date;
  startsAt: Date;
  endsAt: Date;
  studentIds: string[];
}
