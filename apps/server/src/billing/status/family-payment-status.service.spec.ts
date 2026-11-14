import { BillingSubscriptionStatus, Currency, FamilyPaymentState, FamilyPaymentStatus, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';
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
  allocations: { _id: Types.ObjectId; total: number }[] = [],
  pendingPayments: Record<string, unknown>[] = []
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
  const paymentModel = {
    find: jest.fn(() => ({
      lean: () => ({ exec: async () => pendingPayments }),
    })),
  };

  const service = new FamilyPaymentStatusService(subscriptionModel as never, entryModel as never, allocationModel as never, paymentModel as never);

  return { service, subscriptionModel, entryModel, allocationModel, paymentModel };
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

  it('returns an entry in the map for every studentId requested, even with no rows anywhere', async () => {
    const { service } = makeService([], []);
    const result = await service.forGroup(GROUP, [String(STUDENT_1), String(STUDENT_2)], COHORT_START, NOW);

    expect(result.size).toBe(2);
    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.UNPAID);
    expect(result.get(String(STUDENT_2))).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('queries charges scoped to the active subscription only, so an ended subscription\'s unpaid charge never reaches the ledger query', async () => {
    const activeSubId = new Types.ObjectId();
    const subs = [
      {
        _id: activeSubId,
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];
    const { service, entryModel } = makeService(subs, []);
    await service.forGroup(GROUP, [String(STUDENT_1)], COHORT_START, NOW);

    expect(entryModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: { $in: [activeSubId] } })
    );
  });

  it('is PAID even though an ended subscription left behind an unpaid charge, since that charge is no longer this group\'s problem', async () => {
    // The mock's entryModel.find ignores its filter and always returns what's given here, so this
    // asserts the production behaviour: an ended subscription's charge must be filtered out by the
    // real query (proven above), and the status computed from only what a real query would return
    // -- the active subscription's own, fully-covered charge.
    const activeSubId = new Types.ObjectId();
    const chargeId = new Types.ObjectId();
    const subs = [
      {
        _id: activeSubId,
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];
    // Only the active subscription's charge, as the scoped query would actually return.
    const charges = [
      {
        _id: chargeId,
        studentId: STUDENT_1,
        subscriptionId: activeSubId,
        groupId: GROUP,
        type: LedgerEntryType.CHARGE,
        amountMinor: 10_000,
        dueAt: DUE_PAST,
        currency: Currency.EGP,
      },
    ];
    const { service } = makeService(subs, charges, [{ _id: chargeId, total: 10_000 }]);
    const result = await service.forGroup(GROUP, [String(STUDENT_1)], COHORT_START, NOW);

    expect(result.get(String(STUDENT_1))).toBe(FamilyPaymentStatus.PAID);
  });
});

describe('FamilyPaymentStatusService.hasPendingReview', () => {
  it('flags a student whose family has a payment pending review', async () => {
    const familyId = new Types.ObjectId();
    const subs = [
      {
        _id: new Types.ObjectId(),
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        status: BillingSubscriptionStatus.ACTIVE,
        familyId,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];
    const pendingPayments = [{ familyId, status: FamilyPaymentState.PENDING_REVIEW }];

    const { service } = makeService(subs, [], [], pendingPayments);
    const result = await service.hasPendingReview(GROUP, [String(STUDENT_1)]);

    expect(result.has(String(STUDENT_1))).toBe(true);
  });

  it('does not flag a student with no pending payment', async () => {
    const familyId = new Types.ObjectId();
    const subs = [
      {
        _id: new Types.ObjectId(),
        type: SubscriptionType.MONTHLY,
        amountMinor: 10_000,
        status: BillingSubscriptionStatus.ACTIVE,
        familyId,
        items: [{ studentId: STUDENT_1, groupId: GROUP }],
      },
    ];

    const { service } = makeService(subs, [], [], []);
    const result = await service.hasPendingReview(GROUP, [String(STUDENT_1)]);

    expect(result.has(String(STUDENT_1))).toBe(false);
  });
});
