/** The concept's five subscription types. */
export enum SubscriptionType {
  FULL_COURSE = 'FULL_COURSE',
  MONTHLY = 'MONTHLY',
  PER_SESSION = 'PER_SESSION',
  FAMILY = 'FAMILY',
  SCHOLARSHIP = 'SCHOLARSHIP',
}

/**
 * A student's tuition subscription. Deliberately distinct from `SubscriptionStatus`, which is the
 * organization's own SaaS plan status and has nothing to do with a family's tuition.
 */
export enum BillingSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export enum LedgerEntryType {
  /** Adds to what the family owes. */
  CHARGE = 'CHARGE',
  /** Reduces what the family owes. */
  PAYMENT = 'PAYMENT',
  /** A correction, carrying a sign and a required reason. */
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum FamilyPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

/** A payment as it moves from the parent's intent to confirmed money. */
export enum FamilyPaymentState {
  AWAITING_RECEIPT = 'AWAITING_RECEIPT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

/**
 * Method keys are strings, not an enum, so adding a method is implementing an interface and
 * registering a provider — never editing a shared enum that every caller then has to re-switch on.
 */
export const PAYMENT_METHOD_RECEIPT_UPLOAD = 'RECEIPT_UPLOAD';
export const PAYMENT_METHOD_ONLINE_GATEWAY = 'ONLINE_GATEWAY';
export const PAYMENT_METHOD_MANUAL_TRANSFER = 'MANUAL_TRANSFER';

/** The kind of value an admin-configured manual-transfer method field holds. */
export enum PaymentMethodFieldType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  LINK = 'LINK',
}

/** A reminder goes out on the due date, then once every this many days until the charge is covered. */
export const BILLING_REMINDER_INTERVAL_DAYS = 3;
