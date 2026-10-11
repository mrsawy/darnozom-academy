export enum GroupStatus {
  FORMING = 'FORMING',
  READY_TO_START = 'READY_TO_START',
  CANCELLED = 'CANCELLED',
}

export enum GroupPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

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
