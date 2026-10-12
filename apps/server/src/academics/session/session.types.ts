import { Types } from 'mongoose';
import { AttendanceStatus, FollowUpDecision, SessionStatus } from '@darnozom/shared-types';

export interface SessionAttendanceLean {
  studentId: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
  markedBy: Types.ObjectId;
  markedAt: Date;
}

export interface SessionEvaluationLean {
  studentId: Types.ObjectId;
  participation: number;
  understanding: number;
  behavior: number;
  homework: number;
  note?: string;
}

export interface SessionReportLean {
  evaluations: SessionEvaluationLean[];
  summary?: string;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
}

export interface SessionLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sequence: number;
  startsAt: Date;
  endsAt: Date;
  status: SessionStatus;
  teacherAttendance?: AttendanceStatus | null;
  attendance: SessionAttendanceLean[];
  report?: SessionReportLean | null;
  cancelReason?: string;
  cancelledBy?: Types.ObjectId;
}

/** What the API returns: `status` is the effective (derived) status. */
export type SessionView = SessionLean & { groupName?: string };

/** findOne adds the roster (ACTIVE students visible to the caller) and display names (id → "First Last"). */
export type SessionDetailView = SessionView & { people: Record<string, string>; roster: string[] };

export interface FollowUpLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  sessionId: Types.ObjectId;
  studentId: Types.ObjectId;
  parentFeedback?: string;
  decision?: FollowUpDecision;
  recordedBy?: Types.ObjectId;
  recordedAt?: Date;
}
