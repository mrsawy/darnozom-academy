import { Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { FamilyService } from './family.service';

const PARENT = new Types.ObjectId();
const CHILD_A = new Types.ObjectId();
const CHILD_B = new Types.ObjectId();
const LONE = new Types.ObjectId();

const makeService = (users: Record<string, unknown>[], subscriptions: Record<string, unknown>[] = []) => {
  const userModel = {
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => users }) }) })),
  };
  const subscriptionModel = {
    findOne: jest.fn(() => ({
      sort: () => ({ lean: () => ({ exec: async () => subscriptions[0] ?? null }) }),
    })),
  };
  return { service: new FamilyService(userModel as never, subscriptionModel as never), userModel, subscriptionModel };
};

const actor = (id: string, roleName: Roles) => ({ _id: id, organizationId: 'o1', roleName, additionalRoles: [] as Roles[] });

describe('FamilyService.resolve', () => {
  it('maps each child to its parent, and a parentless student to itself', async () => {
    const { service } = makeService([
      { _id: CHILD_A, parentUserId: PARENT },
      { _id: CHILD_B, parentUserId: PARENT },
      { _id: LONE, parentUserId: null },
    ]);
    const map = await service.resolve([String(CHILD_A), String(CHILD_B), String(LONE)]);
    expect(map.get(String(CHILD_A))).toBe(String(PARENT));
    expect(map.get(String(CHILD_B))).toBe(String(PARENT));
    expect(map.get(String(LONE))).toBe(String(LONE));
  });

  it('returns an empty map for an empty request, without querying', async () => {
    const { service, userModel } = makeService([]);
    await expect(service.resolve([])).resolves.toEqual(new Map());
    expect(userModel.find).not.toHaveBeenCalled();
  });
});

describe('FamilyService.canActorReadFamily', () => {
  it('lets a parent read their own family', async () => {
    const { service } = makeService([]);
    await expect(service.canActorReadFamily(actor(String(PARENT), Roles.PARENT), String(PARENT))).resolves.toBe(true);
  });

  it('refuses a parent reading another family', async () => {
    const { service } = makeService([]);
    await expect(service.canActorReadFamily(actor(String(PARENT), Roles.PARENT), String(new Types.ObjectId()))).resolves.toBe(false);
  });

  it('lets a student with no parent read their own family', async () => {
    const { service } = makeService([]);
    await expect(service.canActorReadFamily(actor(String(LONE), Roles.STUDENT), String(LONE))).resolves.toBe(true);
  });

  it('refuses a student whose family is their parent’s, because the parent owns the ledger', async () => {
    const { service } = makeService([{ _id: CHILD_A, parentUserId: PARENT }]);
    await expect(service.canActorReadFamily(actor(String(CHILD_A), Roles.STUDENT), String(PARENT))).resolves.toBe(false);
  });

  it('lets an accountant, a manager and an owner read any family', async () => {
    const { service } = makeService([]);
    for (const role of [Roles.ACCOUNTANT, Roles.MANAGER, Roles.OWNER]) {
      await expect(service.canActorReadFamily(actor(String(new Types.ObjectId()), role), String(PARENT))).resolves.toBe(true);
    }
  });

  it('refuses a teacher, a content officer and a Sharia reviewer', async () => {
    const { service } = makeService([]);
    for (const role of [Roles.INSTRUCTOR, Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER]) {
      await expect(service.canActorReadFamily(actor(String(new Types.ObjectId()), role), String(PARENT))).resolves.toBe(false);
    }
  });
});

describe('FamilyService.resolveOrganizationId', () => {
  const ORG = new Types.ObjectId();

  it('derives the organization from the family’s most recent subscription', async () => {
    const { service, subscriptionModel } = makeService([], [{ organizationId: ORG }]);
    await expect(service.resolveOrganizationId(String(PARENT))).resolves.toBe(String(ORG));
    const calls = subscriptionModel.findOne.mock.calls as unknown as { familyId: Types.ObjectId }[][];
    expect(String(calls[0][0].familyId)).toBe(String(PARENT));
  });

  it('returns null when the family has no subscription yet', async () => {
    const { service } = makeService([], []);
    await expect(service.resolveOrganizationId(String(PARENT))).resolves.toBeNull();
  });
});
