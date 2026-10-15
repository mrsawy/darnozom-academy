import { Currency } from '../currency';

export enum TeacherPayModel {
  FIXED = 'FIXED',
  PER_SESSION = 'PER_SESSION',
  PER_HOUR = 'PER_HOUR',
  PER_STUDENT = 'PER_STUDENT',
  REVENUE_SHARE = 'REVENUE_SHARE',
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
  profileSnapshot: IPayProfileSnapshot;
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
