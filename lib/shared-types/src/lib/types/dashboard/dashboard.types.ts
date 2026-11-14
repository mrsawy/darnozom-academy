export interface IBalanceEntry {
  currency: string;
  amount: number;
}

export interface IActionItem {
  type: 'PAYMENT_DUE' | 'CERT_NAME_REVIEW' | 'RECEIPT_REJECTED';
  groupId?: string;
  groupName?: string;
  familyPaymentId?: string;
  certificateId?: string;
}

export interface IUpcomingSession {
  _id: string;
  groupId: string;
  groupName: string;
  startsAt: string; // ISO
  status: string;
  sessionNumber: number;
}

export interface IGroupCard {
  groupId: string;
  groupName: string;
  nextSession: IUpcomingSession | null;
}

export interface ILatestEvaluation {
  sessionId: string;
  sessionNumber: number;
  scores: Record<string, number>;
  comment?: string;
}

export interface IParentChildCard {
  studentId: string;
  studentName: string;
  groupCards: IGroupCard[];
  latestEvaluation: ILatestEvaluation | null;
  actionItems: IActionItem[];
}

export interface IParentDashboardData {
  children: IParentChildCard[];
}

export interface ITeacherSession extends IUpcomingSession {
  actionLabel: 'TAKE_ATTENDANCE' | 'SUBMIT_REPORT' | 'ENTER_FINAL_RESULTS' | null;
}

export interface ITeacherDashboardData {
  sessions: ITeacherSession[];
}

export interface IAdminDashboardCounts {
  groupsByStatus: Record<string, number>;
  atRiskGroups: number;
  todaySessions: Record<string, number>;
  openTasks: number;
  overdueTasks: number;
  contentAwaitingShariaReview: number;
  receiptsAwaitingReview: number;
  outstandingBalance: IBalanceEntry[];
  payStatementsAwaitingApproval: number;
  certificatesAwaitingReview: number;
}

export interface IOverviewProgramStat {
  programId: string;
  name: string;
  groups: number;
  runningGroups: number;
  students: number;
  /** 0–100, null when no attendance has been recorded yet. */
  attendanceRate: number | null;
}

export interface IOverviewTeacherStat {
  teacherId: string;
  name: string;
  groups: number;
  students: number;
  /** Mean of the four report criteria (1–5) given to this teacher's students; null if none. */
  avgScore: number | null;
  /** 0–100 share of present/late among non-excused marks; null if none. */
  attendanceRate: number | null;
}

export interface IOverviewStudentStat {
  studentId: string;
  name: string;
  /** Mean of the four report criteria (1–5). */
  avgScore: number;
  /** 0–100, null if none recorded. */
  attendanceRate: number | null;
}

export interface IAdminOverview {
  totals: {
    programs: number;
    runningGroups: number;
    activeStudents: number;
    teachers: number;
    atRiskGroups: number;
  };
  programs: IOverviewProgramStat[];
  topTeachers: IOverviewTeacherStat[];
  bottomTeachers: IOverviewTeacherStat[];
  topStudents: IOverviewStudentStat[];
  bottomStudents: IOverviewStudentStat[];
}
