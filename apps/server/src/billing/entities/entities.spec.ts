import { BillingSubscriptionStatus, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';
import { AllocationSchema } from './allocation.entity';
import { LedgerEntrySchema } from './ledger-entry.entity';
import { FamilyPaymentSchema } from './payment.entity';
import { BillingSubscriptionSchema } from './subscription.entity';

const names = (schema: { indexes: () => [unknown, { name?: string }][] }) => schema.indexes().map(([, options]) => options?.name);

describe('BillingSubscriptionSchema', () => {
  it('allows only one active subscription per student and group', () => {
    const entry = BillingSubscriptionSchema.indexes().find(([, options]) => options?.name === 'one_active_subscription_per_student_group');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ 'items.studentId': 1, 'items.groupId': 1 });
    expect(options?.unique).toBe(true);
    expect(options?.partialFilterExpression).toEqual({ status: BillingSubscriptionStatus.ACTIVE });
  });

  it('accepts all five types and starts active', () => {
    const type = BillingSubscriptionSchema.path('type') as unknown as { options: { enum: string[] } };
    expect(type.options.enum).toEqual(Object.values(SubscriptionType));
    expect((BillingSubscriptionSchema.path('status') as unknown as { options: { default: unknown } }).options.default).toBe(
      BillingSubscriptionStatus.ACTIVE
    );
  });

  it('stores the amount in minor units, never below zero, so a full scholarship is 0', () => {
    const amount = BillingSubscriptionSchema.path('amountMinor') as unknown as { options: { min: number; required: boolean } };
    expect(amount.options.min).toBe(0);
    expect(amount.options.required).toBe(true);
  });
});

describe('LedgerEntrySchema', () => {
  it('accepts the three entry types', () => {
    const type = LedgerEntrySchema.path('type') as unknown as { options: { enum: string[] } };
    expect(type.options.enum).toEqual(Object.values(LedgerEntryType));
  });

  it('has no soft-delete fields, because an entry is never deleted', () => {
    expect(LedgerEntrySchema.path('deletedAt')).toBeUndefined();
    expect(LedgerEntrySchema.path('deletedById')).toBeUndefined();
  });

  it('indexes the family statement and the open-charge scan', () => {
    expect(names(LedgerEntrySchema)).toEqual(expect.arrayContaining(['ledger_by_family', 'ledger_open_charges']));
  });

  it('carries a direction only an adjustment uses', () => {
    const direction = LedgerEntrySchema.path('direction') as unknown as { options: { enum: number[]; default: number } };
    expect(direction.options.enum).toEqual([1, -1]);
    expect(direction.options.default).toBe(1);
  });

  it('idempotency key is unique when present, which is what stops a double post', () => {
    const entry = LedgerEntrySchema.indexes().find(([, options]) => options?.name === 'ledger_idempotency');
    expect(entry).toBeDefined();
    expect(entry![1]?.unique).toBe(true);
    expect(entry![1]?.partialFilterExpression).toEqual({ idempotencyKey: { $type: 'string' } });
  });
});

describe('FamilyPaymentSchema', () => {
  it('refers to its receipt by S3 key, matching FileService', () => {
    expect(FamilyPaymentSchema.path('receiptFileKey')).toBeDefined();
    expect(FamilyPaymentSchema.path('receiptFileId')).toBeUndefined();
  });

  it('keeps the method as a free string, so a new strategy needs no schema change', () => {
    const method = FamilyPaymentSchema.path('method') as unknown as { instance: string };
    expect(method.instance).toBe('String');
  });

  it('allows only one payment per gateway payment id, which makes a repeat webhook a no-op', () => {
    const entry = FamilyPaymentSchema.indexes().find(([, options]) => options?.name === 'payment_gateway_unique');
    expect(entry).toBeDefined();
    expect(entry![1]?.unique).toBe(true);
  });
});

describe('AllocationSchema', () => {
  it('allows a payment to be allocated to a charge only once', () => {
    const entry = AllocationSchema.indexes().find(([, options]) => options?.name === 'allocation_unique');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ paymentLedgerEntryId: 1, chargeLedgerEntryId: 1 });
    expect(options?.unique).toBe(true);
  });
});
