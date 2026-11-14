import { Currency } from '../currency';

export enum TeacherPayModel {
  FIXED = 'FIXED',
  PER_SESSION = 'PER_SESSION',
  PER_HOUR = 'PER_HOUR',
  PER_STUDENT = 'PER_STUDENT',
  REVENUE_SHARE = 'REVENUE_SHARE',
}

/** How a teacher is paid for ONE group. */
export enum GroupPayModel {
  /** A flat amount per month for the group. */
  FIXED_PER_GROUP = 'FIXED_PER_GROUP',
  /** A percentage of the subscription money actually collected for the group in the month. */
  PERCENT_OF_SUBSCRIPTIONS = 'PERCENT_OF_SUBSCRIPTIONS',
  /** A flat amount for each active subscription in the group during the month. */
  FIXED_PER_SUBSCRIPTION = 'FIXED_PER_SUBSCRIPTION',
}

export interface IGroupPayRule {
  _id?: string;
  organizationId: string;
  teacherId: string;
  groupId: string;
  model: GroupPayModel;
  /** A percentage (0-100) for PERCENT_OF_SUBSCRIPTIONS, a money amount otherwise. */
  rate: number;
  currency: Currency;
  effectiveFrom: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/** One group's share of a teacher's monthly statement. */
export interface IPayStatementLine {
  groupId: string;
  groupName: string;
  model: GroupPayModel;
  rate: number;
  currency: Currency;
  /** Active subscriptions touching the group during the month. */
  subscriptions: number;
  /** Subscription money collected for the group in the month (major units). */
  collected: number;
  sessions: number;
  amount: number;
}

export enum PayStatementStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export interface ITeacherPayProfile {
  _id?: string;
  organizationId: string;
  teacherId: string;
  model: TeacherPayModel;
  rate: number;
  currency: Currency;
  effectiveFrom: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IPayBasis {
  sessions: number;
  minutes: number;
  students: number;
  revenue: number;
}

export interface IPayBonus {
  amount: number;
  reason: string;
  addedBy: string;
  addedAt: Date | string;
}

export interface IPayProfileSnapshot {
  model: TeacherPayModel;
  rate: number;
  currency: Currency;
}

export interface IPayStatement {
  _id: string;
  organizationId: string;
  teacherId: string;
  month: string;
  /** Legacy single-profile statements only; per-group statements use `lines`. */
  profileSnapshot?: IPayProfileSnapshot;
  currency?: Currency;
  lines?: IPayStatementLine[];
  countedSessionIds: string[];
  basis: IPayBasis;
  baseAmount: number;
  bonuses: IPayBonus[];
  total: number;
  status: PayStatementStatus;
  approvedBy?: string;
  approvedAt?: Date | string;
  paidBy?: string;
  paidAt?: Date | string;
  paymentReference?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
