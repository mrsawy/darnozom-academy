import { ForbiddenException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SupervisionService } from './supervision.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const TEACHER = new Types.ObjectId();
const SESSION = new Types.ObjectId();

const actor = (roleName: Roles, id = String(TEACHER), additionalRoles: Roles[] = []) => ({
  _id: id,
  organizationId: String(ORG),
  roleName,
  additionalRoles,
});

const row = {
  _id: new Types.ObjectId(),
  organizationId: ORG,
  sessionId: SESSION,
  groupId: GROUP,
  teacherId: TEACHER,
  supervisorId: new Types.ObjectId(),
  commitment: 5,
  teaching: 5,
  pedagogy: 5,
  contentAdherence: 5,
  technicalQuality: 5,
  notes: {},
  createdAt: new Date('2026-03-11T00:00:00.000Z'),
};

const makeService = () => {
  const model = {
    find: jest.fn((_filter?: unknown) => ({ sort: () => ({ lean: () => ({ exec: async () => [row] }) }) })),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };
  const sessionModel = {
    find: jest.fn((_filter?: unknown) => ({
      select: () => ({ lean: () => ({ exec: async () => [{ _id: SESSION, sequence: 4, startsAt: row.createdAt }] }) }),
    })),
    findOne: jest.fn(),
  };
  const groupModel = {
    find: jest.fn((_filter?: unknown) => ({
      select: () => ({ lean: () => ({ exec: async () => [{ _id: GROUP, name: 'Group A' }] }) }),
    })),
    findOne: jest.fn(),
  };
  return { service: new SupervisionService(model as never, sessionModel as never, groupModel as never), model };
};

const queryOf = (model: ReturnType<typeof makeService>['model']) => model.find.mock.calls[0][0] as Record<string, unknown>;

describe('SupervisionService.findAll', () => {
  it('scopes a supervisor to their organization and nothing wider', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.SUPERVISOR), {});
    expect(queryOf(model)).toMatchObject({ organizationId: ORG });
    expect(queryOf(model)).not.toHaveProperty('teacherId');
  });

  it('pins a teacher to their own evaluations', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.INSTRUCTOR), {});
    expect(queryOf(model).teacherId).toEqual(TEACHER);
  });

  it('ignores a teacher’s attempt to ask for someone else’s', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.INSTRUCTOR), { teacherId: String(new Types.ObjectId()) });
    expect(queryOf(model).teacherId).toEqual(TEACHER);
  });

  it('refuses an accountant outright, so pedagogical notes stay out of finance', async () => {
    const { service } = makeService();
    await expect(service.findAll(actor(Roles.ACCOUNTANT), {})).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR));
  });

  it('refuses a parent and a student', async () => {
    const { service } = makeService();
    for (const role of [Roles.PARENT, Roles.STUDENT]) {
      await expect(service.findAll(actor(role), {})).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR));
    }
  });

  it('attaches the group name and the session details a list needs', async () => {
    const { service } = makeService();
    const result = await service.findAll(actor(Roles.SUPERVISOR), {});
    expect(result[0]).toMatchObject({ groupName: 'Group A', sessionSequence: 4 });
  });

  it('filters by group when asked', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.SUPERVISOR), { groupId: String(GROUP) });
    expect(queryOf(model).groupId).toEqual(GROUP);
  });

  it('filters by date range when asked', async () => {
    const { service, model } = makeService();
    await service.findAll(actor(Roles.SUPERVISOR), { from: '2026-03-01', to: '2026-03-31' });
    expect(queryOf(model).createdAt).toEqual({ $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') });
  });
});
