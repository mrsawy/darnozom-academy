import { Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, FamilyPaymentState, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';

export interface SubscriptionItemLean {
  studentId: Types.ObjectId | string;
  groupId: Types.ObjectId | string;
}

export interface BillingSubscriptionLean {
  _id: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  familyId: Types.ObjectId | string;
  items: SubscriptionItemLean[];
  type: SubscriptionType;
  amountMinor: number;
  currency: Currency;
  status: BillingSubscriptionStatus;
  createdBy: Types.ObjectId | string;
  note?: string;
  endedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LedgerEntryLean {
  _id: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  familyId: Types.ObjectId | string;
  studentId: Types.ObjectId | string | null;
  groupId: Types.ObjectId | string | null;
  subscriptionId: Types.ObjectId | string | null;
  sessionId: Types.ObjectId | string | null;
  paymentId: Types.ObjectId | string | null;
  type: LedgerEntryType;
  amountMinor: number;
  direction: 1 | -1;
  currency: Currency;
  dueAt: Date | null;
  description: string;
  createdBy: Types.ObjectId | string | null;
  idempotencyKey: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FamilyPaymentLean {
  _id: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  familyId: Types.ObjectId | string;
  method: string;
  amountMinor: number;
  currency: Currency;
  status: FamilyPaymentState;
  receiptFileKey: string | null;
  gatewayPaymentId: string | null;
  payerId: Types.ObjectId | string;
  reviewedBy: Types.ObjectId | string | null;
  reviewedAt: Date | null;
  rejectReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AllocationLean {
  _id: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  paymentLedgerEntryId: Types.ObjectId | string;
  chargeLedgerEntryId: Types.ObjectId | string;
  amountMinor: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** One currency's position for a family. Balances are never summed across currencies. */
export interface LedgerBalance {
  currency: Currency;
  chargedMinor: number;
  paidMinor: number;
  balanceMinor: number;
}
