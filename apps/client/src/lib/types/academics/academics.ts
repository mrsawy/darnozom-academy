import type {
  AtRiskReason,
  AttendanceStatus,
  AvailabilitySlot,
  FollowUpDecision,
  GroupPaymentStatus,
  GroupStatus,
  GroupStudentStatus,
  Readiness,
  ReadinessKey,
  ScheduleSlot,
  SessionStatus,
  TaskClosedReason,
  TaskKind,
  TaskStatus,
  TeacherFitReason,
} from '@darnozom/shared-types';

export interface IProgram {
  _id: string;
  name: string;
  description?: string;
}

export interface ICourseOption {
  _id: string;
  name: string;
  programId?: string | null;
}

export interface ILevel {
  _id: string;
  courseId: string;
  name: string;
  order: number;
}

export interface ICohort {
  _id: string;
  levelId: string;
  name: string;
  startDate: string;
}

export interface IGroupStudent {
  studentId: string;
  paymentStatus: GroupPaymentStatus;
  whatsappAdded: boolean;
  addedAt: string;
  status?: GroupStudentStatus;
}

export interface IGroup {
  _id: string;
  cohortId: string;
  levelId: string;
  courseId: string;
  name: string;
  teacherId: string | null;
  coordinatorId: string | null;
  supervisorId: string | null;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  totalSessions?: number | null;
  meetingLink?: string | null;
  whatsappGroupLink?: string | null;
  contentSent: { done: boolean };
  students: IGroupStudent[];
  status: GroupStatus;
  readiness: Readiness;
  atRisk: boolean;
  atRiskSince: string | null;
  atRiskReason: AtRiskReason | null;
}

export interface IGroupDetail extends IGroup {
  people: Record<string, string>;
}

export interface GroupQuery {
  cohortId?: string;
  status?: GroupStatus;
  childId?: string;
  teacherId?: string;
  atRisk?: boolean;
}

export interface ITask {
  _id: string;
  organizationId: string;
  groupId: string;
  groupName: string;
  kind: TaskKind;
  readinessKey: ReadinessKey;
  milestoneDays: number;
  assigneeId: string | null;
  escalationLevel: number;
  dueAt: string;
  status: TaskStatus;
  closedAt: string | null;
  closedReason: TaskClosedReason | null;
  createdAt: string;
}

export type ITasks = ITask[];

export interface TaskQuery {
  status?: TaskStatus;
  groupId?: string;
}

export interface GroupFormValues {
  name: string;
  schedule: ScheduleSlot[];
  timezone: string;
  minStudents: number;
  maxStudents: number;
  totalSessions: number;
  meetingLink: string | null;
  whatsappGroupLink: string | null;
}

export interface IStudentCandidate {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

export interface ITeacherCandidate {
  teacherId: string;
  name: string;
  ok: boolean;
  reasons: TeacherFitReason[];
}

export interface ITeacherAvailability {
  teacherId: string;
  timezone: string | null;
  slots: AvailabilitySlot[];
}

export interface ISessionAttendance {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  markedAt: string;
}

export interface ISessionEvaluation {
  studentId: string;
  participation: number;
  understanding: number;
  behavior: number;
  homework: number;
  note?: string;
}

export interface ISession {
  _id: string;
  groupId: string;
  groupName?: string;
  teacherId: string;
  sequence: number;
  startsAt: string;
  endsAt: string;
  /** The effective status (SCHEDULED turns REPORT_PENDING once the session has ended). */
  status: SessionStatus;
  teacherAttendance?: AttendanceStatus | null;
  attendance: ISessionAttendance[];
  report?: {
    evaluations: ISessionEvaluation[];
    summary?: string;
    submittedBy: string;
    submittedAt: string;
  } | null;
  cancelReason?: string;
}

export interface ISessionDetail extends ISession {
  /** ACTIVE students visible to the caller. */
  roster: string[];
  people: Record<string, string>;
}

export interface SessionQuery {
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
  status?: SessionStatus;
  childId?: string;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface ReportValues {
  evaluations: ISessionEvaluation[];
  summary?: string;
}

export interface IFollowUp {
  _id: string;
  groupId: string;
  sessionId: string;
  studentId: string;
  parentFeedback?: string;
  decision?: FollowUpDecision;
  recordedAt?: string;
}

export interface IFollowUps {
  rows: IFollowUp[];
  people: Record<string, string>;
}
