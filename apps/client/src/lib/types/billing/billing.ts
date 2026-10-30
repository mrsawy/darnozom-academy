import {
  BillingSubscriptionStatus,
  Currency,
  FamilyPaymentState,
  LedgerEntryType,
  SubscriptionType,
} from '@darnozom/shared-types';

export interface IBillingSubscriptionItem {
  studentId: string;
  groupId: string;
}

export interface IBillingSubscription {
  _id: string;
  organizationId: string;
  familyId: string;
  items: IBillingSubscriptionItem[];
  type: SubscriptionType;
  amountMinor: number;
  currency: Currency;
  status: BillingSubscriptionStatus;
  createdBy: string;
  note?: string;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ILedgerEntry {
  _id: string;
  organizationId: string;
  familyId: string;
  studentId?: string | null;
  groupId?: string | null;
  subscriptionId?: string | null;
  sessionId?: string | null;
  paymentId?: string | null;
  type: LedgerEntryType;
  amountMinor: number;
  direction: 1 | -1;
  currency: Currency;
  dueAt?: string | null;
  description: string;
  createdBy?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ILedgerBalance {
  currency: Currency;
  chargedMinor: number;
  paidMinor: number;
  balanceMinor: number;
}

export interface IFamilyStatement {
  entries: ILedgerEntry[];
  balances: ILedgerBalance[];
}

export interface IFamilyPaymentMethodSnapshotField {
  key: string;
  label: string;
  type: string;
  value: string;
}

export interface IFamilyPaymentMethodSnapshot {
  label: string;
  fields: IFamilyPaymentMethodSnapshotField[];
}

export interface IFamilyPayment {
  _id: string;
  organizationId: string;
  familyId: string;
  payerId: string;
  method: string;
  amountMinor: number;
  currency: Currency;
  status: FamilyPaymentState;
  receiptFileKey?: string;
  rejectReason?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  externalReference?: string | null;
  paymentMethodConfigId?: string | null;
  methodSnapshot?: IFamilyPaymentMethodSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentMethodOption {
  key: string;
}

export interface CreateSubscriptionFormValues {
  type: SubscriptionType;
  amountMinor: number;
  currency: Currency;
  items: IBillingSubscriptionItem[];
  note?: string;
}

export interface CreateAdjustmentFormValues {
  familyId: string;
  amountMinor: number;
  direction: 1 | -1;
  currency: Currency;
  reason: string;
  studentId?: string;
  groupId?: string;
}

export interface InitiatePaymentFormValues {
  method: string;
  amountMinor: number;
  currency: Currency;
  meta?: Record<string, unknown>;
}
