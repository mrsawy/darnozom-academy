import type {
  AtRiskReason,
  AttendanceSource,
  AttendanceStatus,
  AvailabilitySlot,
  FinalResult,
  ICertificateRules,
  FollowUpDecision,
  GroupPaymentStatus,
  GroupStatus,
  GroupStudentStatus,
  MeetingProvider,
  PresenceRole,
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

export interface ITrainingCourse {
  _id: string;
  name: string;
  programId: string | null;
  programs: { _id: string; name: string }[];
}

export interface IAgeRangeSummary {
  _id: string;
  nameEn: string;
  nameAr: string;
  minAge: number;
  maxAge?: number | null;
}

export interface ILevel {
  _id: string;
  courseId: string;
  name: string;
  order: number;
  ageRangeId?: string | null;
  ageRange?: IAgeRangeSummary | null;
  certificateRules?: ICertificateRules;
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
  finalResult?: FinalResult;
  finalResultBy?: string;
  finalResultAt?: string | Date;
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
  /** Effective start date: the group's own, else its batch's. */
  startDate?: string | null;
  estimatedEndDate?: string | null;
  meetingProvider?: MeetingProvider;
  meetingLink?: string | null;
  whatsappGroupLink?: string | null;
  contentSent: { done: boolean };
  students: IGroupStudent[];
  status: GroupStatus;
  readiness: Readiness;
  /** Inherited from the group's level. */
  ageRange?: IAgeRangeSummary | null;
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
  /** ISO date (yyyy-mm-dd). Defaults to the batch's start date. */
  startDate?: string | null;
  estimatedEndDate?: string | null;
  meetingProvider: MeetingProvider;
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
  /** AUTO = recorded by joining the session / end-of-session sweep; MANUAL = set by a person. */
  source?: AttendanceSource;
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
  disputed?: boolean;
  disputeReason?: string;
  disputedBy?: string;
  disputedAt?: string;
  disputeResolvedBy?: string;
  disputeResolvedAt?: string;
}

export interface JoinSessionResult {
  provider: MeetingProvider;
  meetingLink?: string;
  agora?: { appId: string; channelName: string; uid: number; token: string; expiresAt: number };
}

export interface ISessionPresence {
  userId: string;
  role: PresenceRole;
  firstJoinedAt: string;
  totalSeconds: number;
}

export interface ISessionDetail extends ISession {
  /** ACTIVE students visible to the caller. */
  roster: string[];
  people: Record<string, string>;
  /** Who joined through the platform; only filled for staff and the session's teacher. */
  presence?: ISessionPresence[];
  meetingProvider?: MeetingProvider;
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

export interface SupervisionNotes {
  commitment?: string;
  teaching?: string;
  pedagogy?: string;
  contentAdherence?: string;
  technicalQuality?: string;
  general?: string;
}

export interface SupervisionScores {
  commitment: number;
  teaching: number;
  pedagogy: number;
  contentAdherence: number;
  technicalQuality: number;
  notes?: SupervisionNotes;
}

export interface ISupervisionEvaluation extends SupervisionScores {
  _id: string;
  sessionId: string;
  groupId: string;
  groupName: string;
  sessionSequence: number;
  sessionStartsAt: string;
  teacherId: string;
  supervisorId: string;
  notes: SupervisionNotes;
  createdAt: string;
}

export interface EvaluationQuery {
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
}

export interface IAttendanceMatrix {
  sessions: {
    id: string;
    sequence: number;
    startsAt: string;
    status: SessionStatus;
    teacherAttendance: AttendanceStatus | null;
  }[];
  students: {
    studentId: string;
    name: string;
    cells: Record<string, AttendanceStatus | null>;
    /** attended (present or late) / held sessions; null before any session was held. */
    attendedRate: number | null;
  }[];
  teacherAttendedRate: number | null;
}

export const EVALUATION_CRITERIA = [
  'commitment',
  'teaching',
  'pedagogy',
  'contentAdherence',
  'technicalQuality',
] as const;
export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export interface ITeacherOverview {
  teacher: { id: string; name: string; email?: string; phone?: string; avatar?: string };
  groups: { id: string; name: string; status: GroupStatus; activeStudents: number }[];
  stats: {
    total: number;
    completed: number;
    cancelled: number;
    reportsMissing: number;
    attendance: Record<AttendanceStatus | 'UNRECORDED', number>;
    avgJoinDelayMinutes: number | null;
    avgReportDelayHours: number | null;
  };
  evaluations: {
    count: number;
    averages: Record<EvaluationCriterion, number> | null;
    recent: ({ id: string; sessionId: string; createdAt: string } & Record<EvaluationCriterion, number>)[];
  };
  recentSessions: {
    id: string;
    groupId: string;
    groupName?: string;
    sequence: number;
    startsAt: string;
    status: SessionStatus;
    teacherAttendance: AttendanceStatus | null;
    reportSubmitted: boolean;
    joinedAt: string | null;
    joinedMinutes: number | null;
  }[];
}

export interface TeacherOverviewQuery {
  id: string;
  from?: string;
  to?: string;
}
