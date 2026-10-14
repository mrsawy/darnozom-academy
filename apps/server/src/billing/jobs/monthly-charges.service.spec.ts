import { BillingSubscriptionStatus, Currency, GroupStatus, GroupStudentStatus, SubscriptionType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { monthlyIdempotencyKey } from '../domain/charge-schedule';
import { MonthlyChargesService } from './monthly-charges.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const COHORT = new Types.ObjectId();
const SUB = new Types.ObjectId();
const STUDENT = new Types.ObjectId();
const FAMILY = new Types.ObjectId();

const NOW = new Date('2026-03-15T12:00:00.000Z');
const COHORT_START = new Date('2026-01-01T00:00:00.000Z');

const sub = (overrides: Record<string, unknown> = {}) => ({
  _id: SUB,
  organizationId: ORG,
  familyId: FAMILY,
  type: SubscriptionType.MONTHLY,
  status: BillingSubscriptionStatus.ACTIVE,
  amountMinor: 10_000,
  currency: Currency.EGP,
  items: [{ studentId: STUDENT, groupId: GROUP }],
  ...overrides,
});

const group = (overrides: Record<string, unknown> = {}) => ({
  _id: GROUP,
  organizationId: ORG,
  cohortId: COHORT,
  status: GroupStatus.RUNNING,
  timezone: 'UTC',
  students: [{ studentId: STUDENT, status: GroupStudentStatus.ACTIVE }],
  ...overrides,
});

const cohort = (overrides: Record<string, unknown> = {}) => ({
  _id: COHORT,
  startDate: COHORT_START,
  ...overrides,
});

const makeService = (subscriptions = [sub()], groups: Record<string, unknown>[] = [group()], cohorts: Record<string, unknown>[] = [cohort()]) => {
  const subscriptionModel = {
    find: jest.fn(() => ({
      lean: () => ({
        exec: async () => subscriptions,
      }),
    })),
  };
  const groupModel = {
    findOne: jest.fn((filter: { _id?: unknown }) => ({
      lean: () => ({
        exec: async () => groups.find((g) => String(g._id) === String(filter._id)) ?? null,
      }),
    })),
  };
  const cohortModel = {
    findOne: jest.fn((filter: { _id?: unknown }) => ({
      lean: () => ({
        exec: async () => cohorts.find((c) => String(c._id) === String(filter._id)) ?? null,
      }),
    })),
  };
  const ledger = {
    postCharges: jest.fn(async (input: { charges: unknown[] }) => input.charges),
  };
  const service = new MonthlyChargesService(subscriptionModel as never, groupModel as never, cohortModel as never, ledger as never);
  return { service, ledger };
};

describe('MonthlyChargesService.run', () => {
  it('posts one charge per month due since cohort start for an active monthly subscription on a running group', async () => {
    const { service, ledger } = makeService();
    const count = await service.run(NOW);
    expect(count).toBe(2);
    expect(ledger.postCharges).toHaveBeenCalledTimes(1);

    const callArgs = ledger.postCharges.mock.calls[0][0] as {
      charges: { dueAt: Date; idempotencyKey: string; amountMinor: number }[];
    };
    expect(callArgs.charges).toHaveLength(2);
    expect(callArgs.charges[0].idempotencyKey).toBe(monthlyIdempotencyKey(String(SUB), callArgs.charges[0].dueAt));
    expect(callArgs.charges[1].idempotencyKey).toBe(monthlyIdempotencyKey(String(SUB), callArgs.charges[1].dueAt));
  });

  it('relies on the ledger idempotency key skip so a second run calls postCharges with the same keys without filtering them itself', async () => {
    const { service, ledger } = makeService();
    await service.run(NOW);
    await service.run(NOW);
    expect(ledger.postCharges).toHaveBeenCalledTimes(2);
    const call1 = ledger.postCharges.mock.calls[0][0] as { charges: { idempotencyKey: string }[] };
    const call2 = ledger.postCharges.mock.calls[1][0] as { charges: { idempotencyKey: string }[] };
    expect(call1.charges.map((c) => c.idempotencyKey)).toEqual(call2.charges.map((c) => c.idempotencyKey));
  });

  it('posts nothing when the group is not RUNNING', async () => {
    const { service, ledger } = makeService([sub()], [group({ status: GroupStatus.FORMING })]);
    const count = await service.run(NOW);
    expect(count).toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('posts nothing for an ENDED subscription', async () => {
    const { service, ledger } = makeService([sub({ status: BillingSubscriptionStatus.ENDED })]);
    const count = await service.run(NOW);
    expect(count).toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('posts nothing for a FULL_COURSE subscription', async () => {
    const { service, ledger } = makeService([sub({ type: SubscriptionType.FULL_COURSE })]);
    const count = await service.run(NOW);
    expect(count).toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('posts nothing for a withdrawn student', async () => {
    const { service, ledger } = makeService([sub()], [group({ students: [{ studentId: STUDENT, status: GroupStudentStatus.WITHDRAWN }] })]);
    const count = await service.run(NOW);
    expect(count).toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('skips a group with an unreadable timezone while the rest still post', async () => {
    const sub2Id = new Types.ObjectId();
    const group2Id = new Types.ObjectId();
    const sub2 = sub({ _id: sub2Id, items: [{ studentId: STUDENT, groupId: group2Id }] });
    const groupBadTz = group({ timezone: 'INVALID_ZONE' });
    const group2Good = group({ _id: group2Id, timezone: 'UTC' });

    const { service, ledger } = makeService([sub(), sub2], [groupBadTz, group2Good]);
    const count = await service.run(NOW);
    expect(count).toBe(2);
    expect(ledger.postCharges).toHaveBeenCalledTimes(1);
    const callArgs = ledger.postCharges.mock.calls[0][0] as unknown as { subscriptionId: string };
    expect(callArgs.subscriptionId).toBe(String(sub2Id));
  });
});
