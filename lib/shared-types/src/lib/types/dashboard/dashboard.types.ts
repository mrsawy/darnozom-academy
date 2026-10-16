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
