export enum GroupStatus {
  FORMING = 'FORMING',
  READY_TO_START = 'READY_TO_START',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GroupPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export enum GroupStudentStatus {
  ACTIVE = 'ACTIVE',
  WITHDRAWN = 'WITHDRAWN',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  REPORT_PENDING = 'REPORT_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum FollowUpDecision {
  CONTINUE = 'CONTINUE',
  WITHDRAW = 'WITHDRAW',
}

export const SESSION_SCORE_MIN = 1;
export const SESSION_SCORE_MAX = 5;
export const TOTAL_SESSIONS_MAX = 500;
/** Teachers/staff may record attendance from this many minutes before a session starts. */
export const ATTENDANCE_OPEN_MINUTES_BEFORE = 15;
/** A submitted report stays editable by its teacher for this many hours. */
export const REPORT_EDIT_WINDOW_HOURS = 24;

export enum ReadinessKey {
  TEACHER_ASSIGNED = 'TEACHER_ASSIGNED',
  MINIMUM_STUDENTS = 'MINIMUM_STUDENTS',
  PAYMENTS_MADE = 'PAYMENTS_MADE',
  CONTENT_SENT = 'CONTENT_SENT',
  MEETING_LINK = 'MEETING_LINK',
}

export enum TeacherFitReason {
  NOT_INSTRUCTOR = 'NOT_INSTRUCTOR',
  NO_AVAILABILITY = 'NO_AVAILABILITY',
  OUTSIDE_AVAILABILITY = 'OUTSIDE_AVAILABILITY',
  CONFLICT = 'CONFLICT',
}

/** statusHistory reason used when the system reverts READY_TO_START → FORMING. */
export const READINESS_LOST_REASON = 'READINESS_LOST';

/** One weekly meeting of a group. dayOfWeek: 0 = Sunday … 6 = Saturday; startTime "HH:mm". */
export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
}

/** One weekly availability window. endTime "HH:mm" or "24:00"; endTime > startTime. */
export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ReadinessItem {
  key: ReadinessKey;
  done: boolean;
}

export interface Readiness {
  ready: boolean;
  items: ReadinessItem[];
}
