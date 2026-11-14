import { BadRequestException } from '@nestjs/common';
import { BillingErrors, Currency, LedgerEntryType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { BILLING_LEDGER_CHANGED_EVENT } from '../events/billing.events';
import { LedgerService } from './ledger.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const ACTOR = new Types.ObjectId();
const PAYMENT = new Types.ObjectId();

const charge = (overrides: Record<string, unknown> = {}) => ({
  amountMinor: 10_000,
  dueAt: new Date('2026-03-01T00:00:00.000Z'),
  studentId: null,
  groupId: String(GROUP),
  idempotencyKey: null,
  descriptionKey: 'billing.charge.fullCourse',
  ...overrides,
});

const openCharge = (id: Types.ObjectId, amountMinor: number, currency = Currency.EGP, overrides: Record<string, unknown> = {}) => ({
  _id: id,
  currency,
  dueAt: new Date('2026-03-01T00:00:00.000Z'),
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  amountMinor,
  type: LedgerEntryType.CHARGE,
  subscriptionId: null,
  studentId: null,
  ...overrides,
});

const makeService = (
  existingCharges: Record<string, unknown>[] = [],
  duplicateKeys: string[] = [],
  existingPayments: Record<string, unknown>[] = [],
  allocatedByPayment: Record<string, number> = {},
  paymentScopes: Record<string, unknown>[] = []
) => {
  const written: Record<string, unknown>[] = [];
  const entryModel = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      if (typeof doc.idempotencyKey === 'string' && duplicateKeys.includes(doc.idempotencyKey)) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11_000;
        throw error;
      }
      written.push({ ...doc, _id: new Types.ObjectId(), createdAt: new Date() });
      return written.at(-1);
    }),
    find: jest.fn((filter: Record<string, unknown> = {}) => {
      const rows =
        filter.type === LedgerEntryType.PAYMENT ? existingPayments.filter((payment) => !filter.currency || payment.currency === filter.currency) : existingCharges;
      return {
        sort: () => ({ lean: () => ({ exec: async () => rows }) }),
        select: () => ({ lean: () => ({ exec: async () => rows }) }),
      };
    }),
    aggregate: jest.fn(async () => []),
  };
  const allocationModel = {
    insertMany: jest.fn(async (docs: unknown[]) => docs),
    // Credit lookups group by payment; charge lookups group by charge. Only the former is seeded.
    aggregate: jest.fn(async (pipeline: { $match?: Record<string, unknown> }[]) =>
      pipeline[0]?.$match && 'paymentLedgerEntryId' in pipeline[0].$match
        ? Object.entries(allocatedByPayment).map(([id, total]) => ({ _id: new Types.ObjectId(id), total }))
        : []
    ),
  };
  const paymentModel = { find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => paymentScopes }) }) })) };
  const events = { emit: jest.fn() };
  const service = new LedgerService(entryModel as never, allocationModel as never, events as never, paymentModel as never);
  return { service, entryModel, allocationModel, events, written };
};

describe('LedgerService.postCharges', () => {
  it('writes one CHARGE row per planned charge', async () => {
    const { service, written } = makeService();
    await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      createdBy: String(ACTOR),
      charges: [charge(), charge({ amountMinor: 5000 })],
    });
    expect(written).toHaveLength(2);
    expect(written.every((row) => row.type === LedgerEntryType.CHARGE)).toBe(true);
    expect(written.every((row) => row.direction === 1)).toBe(true);
  });

  it('writes nothing for an empty plan and emits no event', async () => {
    const { service, written, events } = makeService();
    await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      charges: [],
    });
    expect(written).toHaveLength(0);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('skips a charge whose idempotency key already exists, instead of failing the batch', async () => {
    const { service, written } = makeService([], ['monthly:sub1:x']);
    const result = await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      charges: [charge({ idempotencyKey: 'monthly:sub1:x' }), charge({ idempotencyKey: 'monthly:sub1:y' })],
    });
    expect(result).toHaveLength(1);
    expect(written).toHaveLength(1);
    expect(written[0].idempotencyKey).toBe('monthly:sub1:y');
  });

  it('announces the change with the groups it touched, so readiness can be re-evaluated', async () => {
    const { service, events } = makeService();
    await service.postCharges({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      currency: Currency.EGP,
      charges: [charge()],
    });
    expect(events.emit).toHaveBeenCalledWith(
      BILLING_LEDGER_CHANGED_EVENT,
      expect.objectContaining({ familyId: String(FAMILY), groupIds: [String(GROUP)] })
    );
  });

  it('refuses an amount that is not a non-negative integer', async () => {
    const { service } = makeService();
    await expect(
      service.postCharges({
        organizationId: String(ORG),
        familyId: String(FAMILY),
        currency: Currency.EGP,
        charges: [charge({ amountMinor: 10.5 })],
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
  });
});

describe('LedgerService.postCharges - prepaid credit', () => {
  const PAID_LEDGER_ID = new Types.ObjectId();
  const PAID_PAYMENT_ID = new Types.ObjectId();
  const credit = (overrides: Record<string, unknown> = {}) => ({
    _id: PAID_LEDGER_ID,
    paymentId: PAID_PAYMENT_ID,
    amountMinor: 10_000,
    type: LedgerEntryType.PAYMENT,
    currency: Currency.EGP,
    ...overrides,
  });
  const input = (extra: Record<string, unknown> = {}) => ({
    organizationId: String(ORG),
    familyId: String(FAMILY),
    currency: Currency.EGP,
    charges: [charge({ amountMinor: 10_000 })],
    ...extra,
  });
  // The new charge is read back through openCharges, which uses the same mocked find.
  const newCharge = (id: Types.ObjectId, amountMinor: number, overrides: Record<string, unknown> = {}) =>
    openCharge(id, amountMinor, Currency.EGP, overrides);

  it('settles a newly posted charge with money the family already paid ahead', async () => {
    const chargeId = new Types.ObjectId();
    const { service, allocationModel } = makeService([newCharge(chargeId, 10_000)], [], [credit()]);
    await service.postCharges(input());
    expect(allocationModel.insertMany).toHaveBeenCalledTimes(1);
    const rows = allocationModel.insertMany.mock.calls[0][0] as {
      amountMinor: number;
      chargeLedgerEntryId: Types.ObjectId;
      paymentLedgerEntryId: Types.ObjectId;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].amountMinor).toBe(10_000);
    expect(String(rows[0].chargeLedgerEntryId)).toBe(String(chargeId));
    expect(String(rows[0].paymentLedgerEntryId)).toBe(String(PAID_LEDGER_ID));
  });

  it('only spends what is left of a payment, never money it already settled', async () => {
    const { service, allocationModel } = makeService([newCharge(new Types.ObjectId(), 10_000)], [], [credit()], {
      [String(PAID_LEDGER_ID)]: 7000,
    });
    await service.postCharges(input());
    const rows = allocationModel.insertMany.mock.calls[0][0] as { amountMinor: number }[];
    expect(rows[0].amountMinor).toBe(3000);
  });

  it('does nothing when every payment is already fully spent', async () => {
    const { service, allocationModel } = makeService([newCharge(new Types.ObjectId(), 10_000)], [], [credit()], {
      [String(PAID_LEDGER_ID)]: 10_000,
    });
    await service.postCharges(input());
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
  });

  it('does nothing when the family has never paid', async () => {
    const { service, allocationModel } = makeService([newCharge(new Types.ObjectId(), 10_000)]);
    await service.postCharges(input());
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
  });

  it('keeps a payment raised for one subscription away from another subscription charge', async () => {
    const subA = new Types.ObjectId();
    const subB = new Types.ObjectId();
    const { service, allocationModel } = makeService([newCharge(new Types.ObjectId(), 10_000, { subscriptionId: subB })], [], [credit()], {}, [
      { _id: PAID_PAYMENT_ID, subscriptionId: subA },
    ]);
    await service.postCharges(input());
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
  });

  it('lets a payment raised for a subscription settle that subscription own new charge', async () => {
    const subA = new Types.ObjectId();
    const { service, allocationModel } = makeService([newCharge(new Types.ObjectId(), 10_000, { subscriptionId: subA })], [], [credit()], {}, [
      { _id: PAID_PAYMENT_ID, subscriptionId: subA },
    ]);
    await service.postCharges(input());
    expect(allocationModel.insertMany).toHaveBeenCalledTimes(1);
  });

  it('never applies a payment in another currency', async () => {
    const { service, allocationModel } = makeService([newCharge(new Types.ObjectId(), 10_000)], [], [credit({ currency: Currency.USD })]);
    await service.postCharges(input());
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
  });

  it('does not touch credit when nothing new was written (a repeated job run)', async () => {
    const { service, entryModel } = makeService([], ['monthly:sub1:x'], [credit()]);
    await service.postCharges(input({ charges: [charge({ idempotencyKey: 'monthly:sub1:x' })] }));
    expect(entryModel.find).not.toHaveBeenCalled();
  });
});

describe('LedgerService.postPaymentAndAllocate', () => {
  it('writes exactly one PAYMENT row and the allocations for it', async () => {
    const chargeId = new Types.ObjectId();
    const { service, written, allocationModel } = makeService([openCharge(chargeId, 10_000)]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(written.filter((row) => row.type === LedgerEntryType.PAYMENT)).toHaveLength(1);
    expect(allocationModel.insertMany).toHaveBeenCalledWith([expect.objectContaining({ chargeLedgerEntryId: chargeId, amountMinor: 10_000 })]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('keeps an over-payment as an unallocated credit', async () => {
    const chargeId = new Types.ObjectId();
    const { service } = makeService([openCharge(chargeId, 4000)]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(result.unallocatedMinor).toBe(6000);
  });

  it('writes the payment row even when nothing could be allocated', async () => {
    const { service, written, allocationModel } = makeService([]);
    await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(written).toHaveLength(1);
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
  });

  it('never allocates across currencies', async () => {
    const { service, allocationModel } = makeService([openCharge(new Types.ObjectId(), 10_000, Currency.USD)]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('is keyed on the payment, so the same payment cannot post twice', async () => {
    const { service, written } = makeService([]);
    await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(written[0].idempotencyKey).toBe(`payment:${String(PAYMENT)}`);
  });

  it('when scoped to a subscription, settles only that subscription\'s own charge, never an older one from a different subscription', async () => {
    const oldSubChargeId = new Types.ObjectId();
    const targetSubChargeId = new Types.ObjectId();
    const targetSub = new Types.ObjectId();
    const { service, allocationModel } = makeService([
      // The old subscription's charge is due first, so unscoped FIFO would hit it first.
      openCharge(oldSubChargeId, 10_000, Currency.EGP, { subscriptionId: new Types.ObjectId(), dueAt: new Date('2026-01-01') }),
      openCharge(targetSubChargeId, 10_000, Currency.EGP, { subscriptionId: targetSub, dueAt: new Date('2026-06-01') }),
    ]);
    await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
      subscriptionId: String(targetSub),
    });
    expect(allocationModel.insertMany).toHaveBeenCalledWith([expect.objectContaining({ chargeLedgerEntryId: targetSubChargeId })]);
  });

  it('leaves the payment unallocated as a credit when the target subscription has no open charge', async () => {
    const { service, allocationModel } = makeService([
      openCharge(new Types.ObjectId(), 10_000, Currency.EGP, { subscriptionId: new Types.ObjectId() }),
    ]);
    const result = await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
      subscriptionId: String(new Types.ObjectId()),
    });
    expect(allocationModel.insertMany).not.toHaveBeenCalled();
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('falls back to family-wide FIFO when no subscription is specified, unchanged from before', async () => {
    const chargeId = new Types.ObjectId();
    const { service, allocationModel } = makeService([openCharge(chargeId, 10_000, Currency.EGP, { subscriptionId: new Types.ObjectId() })]);
    await service.postPaymentAndAllocate({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      paymentId: String(PAYMENT),
      amountMinor: 10_000,
      currency: Currency.EGP,
      createdBy: String(ACTOR),
    });
    expect(allocationModel.insertMany).toHaveBeenCalledWith([expect.objectContaining({ chargeLedgerEntryId: chargeId })]);
  });
});

describe('LedgerService.openCharges', () => {
  it('carries the subscription and student each charge belongs to', async () => {
    const chargeId = new Types.ObjectId();
    const subscriptionId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const { service } = makeService([openCharge(chargeId, 10_000, Currency.EGP, { subscriptionId, studentId })]);
    const [open] = await service.openCharges(String(FAMILY));
    expect(open.subscriptionId).toBe(String(subscriptionId));
    expect(open.studentId).toBe(String(studentId));
  });

  it('returns null subscription and student when the charge has none', async () => {
    const chargeId = new Types.ObjectId();
    const { service } = makeService([openCharge(chargeId, 10_000)]);
    const [open] = await service.openCharges(String(FAMILY));
    expect(open.subscriptionId).toBeNull();
    expect(open.studentId).toBeNull();
  });
});

describe('LedgerService.postAdjustment', () => {
  it('requires a reason', async () => {
    const { service } = makeService();
    await expect(
      service.postAdjustment({
        organizationId: String(ORG),
        familyId: String(FAMILY),
        amountMinor: 1000,
        direction: -1,
        currency: Currency.EGP,
        reason: '  ',
        createdBy: String(ACTOR),
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.ADJUSTMENT_REASON_REQUIRED));
  });

  it('writes the reason as the description and keeps the sign in direction', async () => {
    const { service, written } = makeService();
    await service.postAdjustment({
      organizationId: String(ORG),
      familyId: String(FAMILY),
      amountMinor: 1000,
      direction: -1,
      currency: Currency.EGP,
      reason: 'Agreed discount',
      createdBy: String(ACTOR),
    });
    expect(written[0]).toMatchObject({
      type: LedgerEntryType.ADJUSTMENT,
      amountMinor: 1000,
      direction: -1,
      description: 'Agreed discount',
    });
  });

  it('only accepts 1 or -1 as a direction', async () => {
    const { service } = makeService();
    await expect(
      service.postAdjustment({
        organizationId: String(ORG),
        familyId: String(FAMILY),
        amountMinor: 1000,
        direction: 0 as 1 | -1,
        currency: Currency.EGP,
        reason: 'x',
        createdBy: String(ACTOR),
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
  });
});

describe('LedgerService — the append-only guarantee', () => {
  it('exposes no method that updates or deletes an entry', () => {
    const names = Object.getOwnPropertyNames(LedgerService.prototype);
    for (const forbidden of ['update', 'updateEntry', 'delete', 'deleteEntry', 'remove', 'edit']) {
      expect(names).not.toContain(forbidden);
    }
  });
});
