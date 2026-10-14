import { BillingSubscriptionStatus, Currency, FamilyPaymentStatus, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { FamilyPaymentStatusService } from './family-payment-status.service';

const GROUP = new Types.ObjectId();
const STUDENT_1 = new Types.ObjectId();
const STUDENT_2 = new Types.ObjectId();
const SIBLING_1 = new Types.ObjectId();
const SIBLING_2 = new Types.ObjectId();
const DUE_PAST = new Date('2026-03-01T00:00:00.000Z');
const COHORT_START = new Date('2026-04-01T00:00:00.000Z');
const NOW = new Date('2026-03-20T00:00:00.000Z');

const makeService = (
  subscriptions: Record<string, unknown>[] = [],
  charges: Record<string, unknown>[] = [],
  allocations: { _id: Types.ObjectId; total: number }[] = []
) => {
  const subscriptionModel = {
    find: jest.fn(() => ({
      lean: () => ({ exec: async () => subscriptions }),
    })),
  };
  const entryModel = {
    find: jest.fn(() => ({
      lean: () => ({ exec: async () => charges }),
    })),
  };
  const allocationModel = {
    aggregate: jest.fn(async () => allocations),
  };

  const service = new FamilyPaymentStatusService(subscriptionModel as never, entryModel as never, allocationModel as never);

  return { service, subscriptionModel, entryModel, allocationModel };
};

describe('FamilyPaymentStatusService.forGroup', () => {
  it('returns PAID for a student with an active subscription and fully covered charge', async () => {
    const chargeId = new Types.ObjectId();
    const subs = [
      {
        _id: new Types.ObjectId(),
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];
    const charges = [
      {
        _id: chargeId,
        studentId: STUDENT_1,
        groupId: GROUP,
        type: LedgerEntryType.CHARGE,
        amountMinor: 10_000,
        dueAt: DUE_PAST,
        currency: Currency.EGP,
      },
    ];
    const allocations = [{ _id: chargeId, total: 10_000 }];

    const { service } = makeService(subs, charges, allocations);
    const result = await service.forGroup(GROUP, [String(STUDENT_1)], COHORT_START, NOW);

    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.PAID);
  });

  it('returns UNPAID for the same student with a partly covered charge', async () => {
    const chargeId = new Types.ObjectId();
    const subs = [
      {
        _id: new Types.ObjectId(),
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];
    const charges = [
      {
        _id: chargeId,
        studentId: STUDENT_1,
        groupId: GROUP,
        type: LedgerEntryType.CHARGE,
        amountMinor: 10_000,
        dueAt: DUE_PAST,
        currency: Currency.EGP,
      },
    ];
    const allocations = [{ _id: chargeId, total: 4000 }];

    const { service } = makeService(subs, charges, allocations);
    const result = await service.forGroup(GROUP, [String(STUDENT_1)], COHORT_START, NOW);

    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('returns UNPAID for a student with no subscription at all', async () => {
    const { service } = makeService([], []);
    const result = await service.forGroup(GROUP, [String(STUDENT_1)], COHORT_START, NOW);

    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('returns PAID for a student on a zero-amount scholarship with no charges', async () => {
    const subs = [
      {
        _id: new Types.ObjectId(),
        type: SubscriptionType.SCHOLARSHIP,
        amountMinor: 0,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];

    const { service } = makeService(subs, []);
    const result = await service.forGroup(GROUP, [String(STUDENT_1)], COHORT_START, NOW);

    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.PAID);
  });

  it('returns PAID for both siblings when a FAMILY subscription charge is covered, and UNPAID when short', async () => {
    // Ruling: FAMILY charges carry subscriptionId (with studentId: null).
    // The status service maps the charge to every sibling in the subscription for that group.
    const subId = new Types.ObjectId();
    const chargeId = new Types.ObjectId();
    const subs = [
      {
        _id: subId,
        type: SubscriptionType.FAMILY,
        amountMinor: 20_000,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [
          { studentId: SIBLING_1, groupId: GROUP },
          { studentId: SIBLING_2, groupId: GROUP },
        ],
      },
    ];
    const charges = [
      {
        _id: chargeId,
        studentId: null,
        subscriptionId: subId,
        groupId: GROUP,
        type: LedgerEntryType.CHARGE,
        amountMinor: 20_000,
        dueAt: DUE_PAST,
        currency: Currency.EGP,
      },
    ];

    // Fully covered
    const { service: paidService } = makeService(subs, charges, [{ _id: chargeId, total: 20_000 }]);
    const paidResult = await paidService.forGroup(GROUP, [String(SIBLING_1), String(SIBLING_2)], COHORT_START, NOW);
    expect(paidResult.get(String(SIBLING_1))).toBe(FamilyPaymentStatus.PAID);
    expect(paidResult.get(String(SIBLING_2))).toBe(FamilyPaymentStatus.PAID);

    // Partly covered
    const { service: shortService } = makeService(subs, charges, [{ _id: chargeId, total: 10_000 }]);
    const shortResult = await shortService.forGroup(GROUP, [String(SIBLING_1), String(SIBLING_2)], COHORT_START, NOW);
    expect(shortResult.get(String(SIBLING_1))).toBe(FamilyPaymentStatus.UNPAID);
    expect(shortResult.get(String(SIBLING_2))).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('returns an entry in the map for every studentId requested, even with no rows anywhere', async () => {
    const { service } = makeService([], []);
    const result = await service.forGroup(GROUP, [String(STUDENT_1), String(STUDENT_2)], COHORT_START, NOW);

    expect(result.size).toBe(2);
    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.UNPAID);
    expect(result.get(String(STUDENT_2))).toBe(FamilyPaymentStatus.UNPAID);
  });
});
