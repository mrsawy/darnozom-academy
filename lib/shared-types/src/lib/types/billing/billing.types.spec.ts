import {
  BILLING_REMINDER_INTERVAL_DAYS,
  BillingSubscriptionStatus,
  FamilyPaymentStatus,
  LedgerEntryType,
  PAYMENT_METHOD_MANUAL_TRANSFER,
  PAYMENT_METHOD_ONLINE_GATEWAY,
  PAYMENT_METHOD_RECEIPT_UPLOAD,
  PaymentMethodFieldType,
  SubscriptionType,
} from './billing.types';

describe('billing shared types', () => {
  it('has exactly the concept’s five subscription types', () => {
    expect(Object.values(SubscriptionType)).toEqual([
      'FULL_COURSE',
      'MONTHLY',
      'PER_SESSION',
      'FAMILY',
      'SCHOLARSHIP',
    ]);
  });

  it('has the three ledger entry kinds', () => {
    expect(Object.values(LedgerEntryType)).toEqual(['CHARGE', 'PAYMENT', 'ADJUSTMENT']);
  });

  it('keeps a billing subscription either active or ended', () => {
    expect(Object.values(BillingSubscriptionStatus)).toEqual(['ACTIVE', 'ENDED']);
  });

  it('reports a student as paid or unpaid, the same two values the group already shows', () => {
    expect(Object.values(FamilyPaymentStatus)).toEqual(['PAID', 'UNPAID']);
  });

  it('names the two methods shipped in the MVP as plain strings, so a new one needs no enum change', () => {
    expect(PAYMENT_METHOD_RECEIPT_UPLOAD).toBe('RECEIPT_UPLOAD');
    expect(PAYMENT_METHOD_ONLINE_GATEWAY).toBe('ONLINE_GATEWAY');
  });

  it('reminds every three days', () => {
    expect(BILLING_REMINDER_INTERVAL_DAYS).toBe(3);
  });

  it('exposes a stable key for the manual transfer method', () => {
    expect(PAYMENT_METHOD_MANUAL_TRANSFER).toBe('MANUAL_TRANSFER');
  });

  it('defines the three payment method field types', () => {
    expect(Object.values(PaymentMethodFieldType)).toEqual(['TEXT', 'IMAGE', 'LINK']);
  });
});
