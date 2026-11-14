import { Types } from 'mongoose';
import { AttendanceSource, AttendanceStatus, FollowUpDecision, MeetingProvider, PresenceRole, SessionStatus } from '@darnozom/shared-types';

export interface SessionAttendanceLean {
  studentId: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
  markedBy: Types.ObjectId;
  markedAt: Date;
  source?: AttendanceSource;
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

export interface SessionPresenceView {
  userId: string;
  role: PresenceRole;
  firstJoinedAt: Date;
  totalSeconds: number;
}

/** findOne adds the roster (ACTIVE students visible to the caller), display names (id → "First Last"), presence and the group's meeting provider. */
export type SessionDetailView = SessionView & {
  people: Record<string, string>;
  roster: string[];
  /** Who joined through the platform (staff and the session's teacher only; empty for everyone else). */
  presence: SessionPresenceView[];
  meetingProvider?: MeetingProvider;
};

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
