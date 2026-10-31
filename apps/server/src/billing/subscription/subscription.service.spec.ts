import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BillingErrors, BillingSubscriptionStatus, Currency, Roles, SubscriptionType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SubscriptionService } from './subscription.service';

const ORG = new Types.ObjectId();
const PARENT = new Types.ObjectId();
const CHILD_A = new Types.ObjectId();
const CHILD_B = new Types.ObjectId();
const GROUP_A = new Types.ObjectId();
const GROUP_B = new Types.ObjectId();
const ACTOR = new Types.ObjectId();
const MARCH = new Date('2026-03-15T00:00:00.000Z');
const APRIL = new Date('2026-04-01T00:00:00.000Z');

const actor = () => ({ _id: String(ACTOR), organizationId: String(ORG), roleName: Roles.ACCOUNTANT, additionalRoles: [] as Roles[] });

const makeService = (duplicate = false, customFamiliesResolve?: () => Promise<Map<string, string>>) => {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      if (duplicate) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11_000;
        throw error;
      }
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => created }) }) })),
    findOne: jest.fn((..._args: unknown[]) => ({ lean: () => ({ exec: async () => created[0] ?? null }) })),
    updateOne: jest.fn((_filter?: unknown, _update?: unknown) => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({
      lean: () => ({
        exec: async () => [
          { _id: GROUP_A, organizationId: ORG, cohortId: 'c1', students: [{ studentId: CHILD_A }] },
          { _id: GROUP_B, organizationId: ORG, cohortId: 'c2', students: [{ studentId: CHILD_B }] },
        ],
      }),
    })),
  };
  const cohortModel = {
    find: jest.fn(() => ({
      lean: () => ({
        exec: async () => [
          { _id: 'c1', startDate: MARCH },
          { _id: 'c2', startDate: APRIL },
        ],
      }),
    })),
  };
  const families = {
    resolve: jest.fn(
      customFamiliesResolve ??
        (async () =>
          new Map([
            [String(CHILD_A), String(PARENT)],
            [String(CHILD_B), String(PARENT)],
          ]))
    ),
  };
  const ledger = { postCharges: jest.fn(async () => []) };
  const service = new SubscriptionService(model as never, groupModel as never, cohortModel as never, families as never, ledger as never);
  return { service, model, ledger, created };
};

const fullCourse = {
  type: SubscriptionType.FULL_COURSE,
  amountMinor: 50_000,
  currency: Currency.EGP,
  items: [{ studentId: String(CHILD_A), groupId: String(GROUP_A) }],
};

describe('SubscriptionService.create', () => {
  it('records the subscription against the family the student belongs to', async () => {
    const { service, created } = makeService();
    await service.create(actor(), fullCourse);
    expect(created[0]).toMatchObject({ familyId: PARENT, organizationId: ORG, type: SubscriptionType.FULL_COURSE, amountMinor: 50_000 });
  });

  it('posts the initial charges through the ledger', async () => {
    const { service, ledger } = makeService();
    await service.create(actor(), fullCourse);
    expect(ledger.postCharges).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: String(PARENT),
        currency: Currency.EGP,
        charges: [expect.objectContaining({ amountMinor: 50_000, dueAt: MARCH })],
      })
    );
  });

  it('posts nothing for a full scholarship', async () => {
    const { service, ledger } = makeService();
    await service.create(actor(), { ...fullCourse, type: SubscriptionType.SCHOLARSHIP, amountMinor: 0 });
    expect(ledger.postCharges).toHaveBeenCalledWith(expect.objectContaining({ charges: [] }));
  });

  it('accepts a FAMILY subscription with two siblings', async () => {
    const { service, created } = makeService();
    await service.create(actor(), {
      type: SubscriptionType.FAMILY,
      amountMinor: 80_000,
      currency: Currency.EGP,
      items: [
        { studentId: String(CHILD_A), groupId: String(GROUP_A) },
        { studentId: String(CHILD_B), groupId: String(GROUP_B) },
      ],
    });
    expect((created[0].items as unknown[]).length).toBe(2);
  });

  it('refuses a FAMILY subscription with only one child', async () => {
    const { service } = makeService();
    await expect(service.create(actor(), { ...fullCourse, type: SubscriptionType.FAMILY, amountMinor: 80_000 })).rejects.toThrow(
      new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS)
    );
  });

  it('refuses any non-FAMILY type with more than one item', async () => {
    const { service } = makeService();
    await expect(
      service.create(actor(), {
        ...fullCourse,
        items: [
          { studentId: String(CHILD_A), groupId: String(GROUP_A) },
          { studentId: String(CHILD_B), groupId: String(GROUP_B) },
        ],
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID));
  });

  it('refuses a FAMILY subscription spanning two different families', async () => {
    // Ruling: Passed purpose-built families double into makeService instead of monkey-patching.
    const twoFamilies = new Map([
      [String(CHILD_A), String(PARENT)],
      [String(CHILD_B), String(new Types.ObjectId())],
    ]);
    const { service } = makeService(false, async () => twoFamilies);
    await expect(
      service.create(actor(), {
        type: SubscriptionType.FAMILY,
        amountMinor: 80_000,
        currency: Currency.EGP,
        items: [
          { studentId: String(CHILD_A), groupId: String(GROUP_A) },
          { studentId: String(CHILD_B), groupId: String(GROUP_B) },
        ],
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.FAMILY_SUBSCRIPTION_NEEDS_SIBLINGS));
  });

  it('refuses a negative or fractional amount', async () => {
    const { service } = makeService();
    for (const amountMinor of [-1, 10.5]) {
      await expect(service.create(actor(), { ...fullCourse, amountMinor })).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
    }
  });

  it('refuses a second active subscription for the same student and group', async () => {
    const { service } = makeService(true);
    await expect(service.create(actor(), fullCourse)).rejects.toThrow(new ConflictException(BillingErrors.SUBSCRIPTION_ALREADY_ACTIVE));
  });

  it('refuses a student who is not in the group they are being subscribed to', async () => {
    const { service } = makeService();
    await expect(service.create(actor(), { ...fullCourse, items: [{ studentId: String(CHILD_B), groupId: String(GROUP_A) }] })).rejects.toThrow(
      new BadRequestException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID)
    );
  });

  it('404s on a group in another organization', async () => {
    const { service } = makeService();
    await expect(
      service.create(actor(), { ...fullCourse, items: [{ studentId: String(CHILD_A), groupId: String(new Types.ObjectId()) }] })
    ).rejects.toThrow(new NotFoundException(BillingErrors.SUBSCRIPTION_ITEMS_INVALID));
  });
});

describe('SubscriptionService.end', () => {
  it('marks the subscription ended and stamps when', async () => {
    // Ruling: Captured created[0]._id instead of reaching into mock result promises.
    const { service, model, created } = makeService();
    await service.create(actor(), fullCourse);
    await service.end(actor(), String(created[0]._id));
    expect(model.updateOne).toHaveBeenCalledWith(expect.objectContaining({ status: BillingSubscriptionStatus.ACTIVE }), {
      $set: expect.objectContaining({ status: BillingSubscriptionStatus.ENDED, endedAt: expect.any(Date) }),
    });
  });

  it('never changes the amount, so posted charges stay explicable', async () => {
    const { service, model, created } = makeService();
    await service.create(actor(), fullCourse);
    await service.end(actor(), String(created[0]._id));
    const [, update] = (model.updateOne.mock.calls[0] ?? []) as [unknown, { $set?: Record<string, unknown> }];
    expect(update?.$set).not.toHaveProperty('amountMinor');
  });
});

describe('SubscriptionService.findForFamily', () => {
  it('finds by family id alone when the caller is the family holder, not scoped by the actor’s organization', async () => {
    const { service, model } = makeService();
    const familyId = String(PARENT);
    const orgLessActor = { _id: familyId, organizationId: '', roleName: Roles.PARENT, additionalRoles: [] as Roles[] };
    await service.findForFamily(orgLessActor, familyId);
    const call = model.find.mock.calls.at(-1) as unknown as [Record<string, unknown>];
    expect(call[0]).toEqual({ familyId: expect.anything() });
    expect(call[0]).not.toHaveProperty('organizationId');
  });

  it('scopes a staff caller’s read to their own organization', async () => {
    const { service, model } = makeService();
    const otherFamily = String(new Types.ObjectId());
    const staffActor = { _id: String(ACTOR), organizationId: String(ORG), roleName: Roles.ACCOUNTANT, additionalRoles: [] as Roles[] };
    await service.findForFamily(staffActor, otherFamily);
    const call = model.find.mock.calls.at(-1) as unknown as [Record<string, unknown>];
    expect(call[0]).toMatchObject({ organizationId: expect.anything() });
  });

  it('refuses a staff caller with no organization', async () => {
    const { service } = makeService();
    const orgLessStaff = { _id: String(ACTOR), organizationId: '', roleName: Roles.ACCOUNTANT, additionalRoles: [] as Roles[] };
    await expect(service.findForFamily(orgLessStaff, String(new Types.ObjectId()))).resolves.toEqual([]);
  });
});
