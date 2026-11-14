import { Currency, GroupPayModel, PayStatementStatus, TeacherPayModel } from '@darnozom/shared-types';

export interface ITeacherPayProfile {
  _id: string;
  organizationId: string;
  teacherId: string;
  model: TeacherPayModel;
  rate: number;
  currency: Currency;
  effectiveFrom: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IGroupPayRule {
  _id: string;
  organizationId: string;
  teacherId: string;
  groupId: string;
  model: GroupPayModel;
  /** A percentage (0-100) for PERCENT_OF_SUBSCRIPTIONS, a money amount otherwise. */
  rate: number;
  currency: Currency;
  effectiveFrom: string;
  endedAt?: string | null;
}

export interface IPayStatementLine {
  groupId: string;
  groupName: string;
  model: GroupPayModel;
  rate: number;
  currency: Currency;
  subscriptions: number;
  collected: number;
  sessions: number;
  amount: number;
}

export interface IPayrollLookup {
  groups: { id: string; name: string; teacherId: string }[];
  teachers: { id: string; name: string }[];
}

export interface UpsertGroupPayRuleInput {
  teacherId: string;
  groupId: string;
  model: GroupPayModel;
  rate: number;
  currency: Currency;
  effectiveFrom?: string;
}

export interface IBonusItem {
  amount: number;
  reason: string;
  addedBy: string;
  addedAt: string;
}

export interface IStatementBasis {
  sessions: number;
  minutes: number;
  students: number;
  revenue: number;
}

export interface IProfileSnapshot {
  model: TeacherPayModel;
  rate: number;
  currency: Currency;
}

export interface IPayStatement {
  _id: string;
  organizationId: string;
  teacherId: string;
  month: string; // "YYYY-MM"
  /** Legacy single-profile statements only; per-group statements use `lines`. */
  profileSnapshot?: IProfileSnapshot;
  currency?: Currency;
  lines?: IPayStatementLine[];
  countedSessionIds: string[];
  basis: IStatementBasis;
  baseAmount: number;
  bonuses: IBonusItem[];
  total: number;
  status: PayStatementStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  paidAt?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTeacherPayProfileInput {
  teacherId: string;
  model: TeacherPayModel;
  rate: number;
  currency: Currency;
  effectiveFrom?: string;
}

export interface FindStatementsQuery {
  month?: string;
  teacherId?: string;
  status?: PayStatementStatus;
}

export interface AddBonusInput {
  id: string;
  amount: number;
  reason: string;
}

export interface MarkPaidInput {
  id: string;
  paymentReference?: string;
}

export interface DisputeSessionInput {
  sessionId: string;
  reason: string;
}

export interface ISessionDisputeResult {
  _id: string;
  disputed: boolean;
  disputeReason?: string;
  disputedBy?: string;
  disputedAt?: string;
  disputeResolvedBy?: string;
  disputeResolvedAt?: string;
}
