import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles, SUPERVISION_EDIT_WINDOW_HOURS } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { SupervisionService } from './supervision.service';

const ORG = new Types.ObjectId();
const EVALUATION = new Types.ObjectId();
const SUPERVISOR = new Types.ObjectId();
const CREATED_AT = new Date('2026-03-01T00:00:00.000Z');

const actor = (id = String(SUPERVISOR), roleName = Roles.SUPERVISOR) => ({
  _id: id,
  organizationId: String(ORG),
  roleName,
  additionalRoles: [] as Roles[],
});

const scores = { commitment: 2, teaching: 2, pedagogy: 2, contentAdherence: 2, technicalQuality: 2 };

const defaultEvaluation: Record<string, unknown> = {
  _id: EVALUATION,
  organizationId: ORG,
  sessionId: new Types.ObjectId(),
  groupId: new Types.ObjectId(),
  teacherId: new Types.ObjectId(),
  supervisorId: SUPERVISOR,
  commitment: 5,
  teaching: 5,
  pedagogy: 5,
  contentAdherence: 5,
  technicalQuality: 5,
  notes: {},
  createdAt: CREATED_AT,
};

const makeService = (evaluation: Record<string, unknown> | null = defaultEvaluation) => {
  const model = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => evaluation }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    create: jest.fn(),
    find: jest.fn(),
  };
  const sessionModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })) };
  const groupModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => null }) })), find: jest.fn() };
  return { service: new SupervisionService(model as never, sessionModel as never, groupModel as never), model };
};

const inWindow = new Date(CREATED_AT.getTime() + 3600 * 1000);

describe('SupervisionService.update', () => {
  it('writes the new scores and notes', async () => {
    const { service, model } = makeService();
    await service.update(actor(), String(EVALUATION), { ...scores, notes: { general: 'Revised.' } }, inWindow);
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: EVALUATION },
      { $set: expect.objectContaining({ ...scores, notes: { general: 'Revised.' } }) }
    );
  });

  it('refuses someone who did not write it, manager or not', async () => {
    const { service } = makeService();
    for (const role of [Roles.SUPERVISOR, Roles.MANAGER, Roles.OWNER]) {
      await expect(service.update(actor(String(new Types.ObjectId()), role), String(EVALUATION), scores, inWindow)).rejects.toThrow(
        new ForbiddenException(AcademicsErrors.NOT_GROUP_SUPERVISOR)
      );
    }
  });

  it('allows an edit on the last second of the window', async () => {
    const { service, model } = makeService();
    const last = new Date(CREATED_AT.getTime() + SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000 - 1000);
    await service.update(actor(), String(EVALUATION), scores, last);
    expect(model.updateOne).toHaveBeenCalled();
  });

  it('refuses an edit once the window has closed', async () => {
    const { service, model } = makeService();
    const past = new Date(CREATED_AT.getTime() + SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000 + 1000);
    await expect(service.update(actor(), String(EVALUATION), scores, past)).rejects.toThrow(
      new ConflictException(AcademicsErrors.EVALUATION_EDIT_WINDOW_CLOSED)
    );
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('refuses an invalid score', async () => {
    const { service } = makeService();
    await expect(service.update(actor(), String(EVALUATION), { ...scores, pedagogy: 0 }, inWindow)).rejects.toThrow(
      new BadRequestException(AcademicsErrors.EVALUATION_INVALID)
    );
  });

  it('never moves the evaluation to another session or teacher', async () => {
    const { service, model } = makeService();
    await service.update(actor(), String(EVALUATION), scores, inWindow);
    const [, update] = model.updateOne.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }];
    for (const immutable of ['sessionId', 'groupId', 'teacherId', 'supervisorId', 'organizationId']) {
      expect(update.$set).not.toHaveProperty(immutable);
    }
  });

  it('404s on an evaluation in another organization', async () => {
    const { service } = makeService(null);
    await expect(service.update(actor(), String(EVALUATION), scores, inWindow)).rejects.toThrow(
      new NotFoundException(AcademicsErrors.EVALUATION_NOT_FOUND)
    );
  });
});
