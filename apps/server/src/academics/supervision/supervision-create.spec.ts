import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles, SessionStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SupervisionService } from './supervision.service';

const ORG = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const TEACHER = new Types.ObjectId();
const SUPERVISOR = new Types.ObjectId();

const actor = (id = String(SUPERVISOR), roleName = Roles.SUPERVISOR) => ({
  _id: id,
  organizationId: String(ORG),
  roleName,
  additionalRoles: [] as Roles[],
});

const scores = { commitment: 5, teaching: 4, pedagogy: 3, contentAdherence: 2, technicalQuality: 1 };

const defaultSession: Record<string, unknown> = {
  _id: SESSION,
  organizationId: ORG,
  groupId: GROUP,
  teacherId: TEACHER,
  sequence: 3,
  startsAt: new Date('2026-03-10T10:00:00.000Z'),
  status: SessionStatus.COMPLETED,
};

const defaultGroup: Record<string, unknown> = {
  _id: GROUP,
  organizationId: ORG,
  name: 'Group A',
  supervisorId: SUPERVISOR,
};

const makeService = (
  session: Record<string, unknown> | null = defaultSession,
  group: Record<string, unknown> | null = defaultGroup,
  duplicate = false
) => {
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      if (duplicate) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11_000;
        throw error;
      }
      return { ...doc, _id: new Types.ObjectId(), createdAt: new Date() };
    }),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => [] }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const sessionModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => session }) })) };
  const groupModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => group }) })),
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => (group ? [group] : []) }) }) })),
  };
  return { service: new SupervisionService(model as never, sessionModel as never, groupModel as never), model };
};

describe('SupervisionService.create', () => {
  it('records the evaluation against the session, group, teacher and supervisor', async () => {
    const { service, model } = makeService();
    await service.create(actor(), String(SESSION), { ...scores, notes: { general: 'Solid.' } });
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        sessionId: SESSION,
        groupId: GROUP,
        teacherId: TEACHER,
        supervisorId: SUPERVISOR,
        ...scores,
      })
    );
  });

  it('keeps the notes it was given', async () => {
    const { service, model } = makeService();
    await service.create(actor(), String(SESSION), { ...scores, notes: { teaching: 'Clear explanations.' } });
    expect(model.create.mock.calls[0][0].notes).toEqual({ teaching: 'Clear explanations.' });
  });

  it('defaults the notes to an empty object rather than undefined', async () => {
    const { service, model } = makeService();
    await service.create(actor(), String(SESSION), { ...scores });
    expect(model.create.mock.calls[0][0].notes).toEqual({});
  });

  it('refuses a session that has not been held', async () => {
    const { service } = makeService({
      _id: SESSION,
      organizationId: ORG,
      groupId: GROUP,
      teacherId: TEACHER,
      sequence: 1,
      startsAt: new Date(),
      status: SessionStatus.SCHEDULED,
    });
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(new ConflictException(AcademicsErrors.SESSION_NOT_HELD));
  });

  it('refuses a cancelled session', async () => {
    const { service } = makeService({
      _id: SESSION,
      organizationId: ORG,
      groupId: GROUP,
      teacherId: TEACHER,
      sequence: 1,
      startsAt: new Date(),
      status: SessionStatus.CANCELLED,
    });
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(new ConflictException(AcademicsErrors.SESSION_NOT_HELD));
  });

  it('refuses a supervisor who does not supervise this group', async () => {
    const { service } = makeService(undefined, { _id: GROUP, organizationId: ORG, name: 'Group A', supervisorId: new Types.ObjectId() });
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR));
  });

  it('lets the supervisor who holds the seat now evaluate a session held earlier, and records them', async () => {
    const newSupervisor = new Types.ObjectId();
    const { service, model } = makeService(undefined, { _id: GROUP, organizationId: ORG, name: 'Group A', supervisorId: newSupervisor });
    await service.create(actor(String(newSupervisor)), String(SESSION), scores);
    expect(model.create.mock.calls[0][0].supervisorId).toEqual(newSupervisor);
  });

  it('refuses a score outside the scale', async () => {
    const { service } = makeService();
    await expect(service.create(actor(), String(SESSION), { ...scores, teaching: 9 })).rejects.toThrow(
      new BadRequestException(AcademicsErrors.EVALUATION_INVALID)
    );
  });

  it('refuses a second evaluation by the same supervisor', async () => {
    const { service } = makeService(undefined, undefined, true);
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(new ConflictException(AcademicsErrors.EVALUATION_ALREADY_EXISTS));
  });

  it('404s on a session in another organization', async () => {
    const { service } = makeService(null);
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
  });

  it('404s when the session’s group has vanished', async () => {
    const { service } = makeService(undefined, null);
    await expect(service.create(actor(), String(SESSION), scores)).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
  });
});
