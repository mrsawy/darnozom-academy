import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionCompletionService } from './session-completion.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const GROUP = id(10);
const SESSION = id(11);
const A = id(2);
const B = id(3);
const actor: AcademicsActor = { _id: String(id(90)), organizationId: String(ORG), roleName: Roles.COORDINATOR, additionalRoles: [] };
const START = new Date('2026-10-12T14:00:00Z');
const END = new Date('2026-10-12T15:00:00Z');

const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  organizationId: ORG,
  groupId: GROUP,
  teacherId: id(1),
  sequence: 1,
  startsAt: START,
  endsAt: END,
  status: SessionStatus.SCHEDULED,
  attendance: [],
  ...over,
});

function setup(openSessions = 0) {
  const sessionModel = {
    countDocuments: jest.fn().mockReturnValue(mockQuery(openSessions)),
    updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })),
    updateMany: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 3 })),
  };
  const groupModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const followUpModel = { bulkWrite: jest.fn().mockResolvedValue({}) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(sessionDoc()),
    activeStudentIds: jest.fn().mockResolvedValue([String(A), String(B)]),
    reload: jest.fn().mockResolvedValue({ reloaded: true }),
  };
  const service = new SessionCompletionService(sessionModel as never, groupModel as never, followUpModel as never, state as never);
  return { service, sessionModel, groupModel, followUpModel, state };
}

describe('SessionCompletionService.onClosed', () => {
  it('creates one follow-up per ACTIVE student when session 1 completes, idempotently', async () => {
    const { service, followUpModel } = setup(2);
    await service.onClosed(sessionDoc({ status: SessionStatus.COMPLETED }) as never, SessionStatus.COMPLETED);
    const ops = followUpModel.bulkWrite.mock.calls[0][0];
    expect(ops).toHaveLength(2);
    expect(ops[0].updateOne.filter).toEqual({ groupId: GROUP, studentId: A });
    expect(ops[0].updateOne.upsert).toBe(true);
    expect(ops[0].updateOne.update.$setOnInsert).toEqual({ organizationId: ORG, groupId: GROUP, sessionId: SESSION, studentId: A });
  });

  it('creates no follow-ups for later sessions or when session 1 is cancelled', async () => {
    const later = setup(2);
    await later.service.onClosed(sessionDoc({ sequence: 2 }) as never, SessionStatus.COMPLETED);
    const cancelled = setup(2);
    await cancelled.service.onClosed(sessionDoc() as never, SessionStatus.CANCELLED);
    expect(later.followUpModel.bulkWrite).not.toHaveBeenCalled();
    expect(cancelled.followUpModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('completes the RUNNING group once no session is left open', async () => {
    const { service, sessionModel, groupModel } = setup(0);
    await service.onClosed(sessionDoc({ sequence: 5 }) as never, SessionStatus.COMPLETED);
    expect(sessionModel.countDocuments).toHaveBeenCalledWith({ groupId: GROUP, status: { $nin: [SessionStatus.COMPLETED, SessionStatus.CANCELLED] } });
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: GROUP, status: GroupStatus.RUNNING });
    expect(update.$set).toEqual({ status: GroupStatus.COMPLETED });
    expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.RUNNING, to: GroupStatus.COMPLETED, by: null });
  });

  it('keeps the group RUNNING while a session is still open', async () => {
    const { service, groupModel } = setup(1);
    await service.onClosed(sessionDoc({ sequence: 2 }) as never, SessionStatus.COMPLETED);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('SessionCompletionService.cancel', () => {
  it('cancels a session that has not ended, with the reason and who did it', async () => {
    const { service, sessionModel } = setup(2);
    await service.cancel(actor, String(SESSION), '  teacher is ill ', new Date('2026-10-12T13:00:00Z'));
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: SessionStatus.SCHEDULED });
    expect(update.$set).toEqual({ status: SessionStatus.CANCELLED, cancelReason: 'teacher is ill', cancelledBy: new Types.ObjectId(actor._id) });
  });

  it('needs a reason', async () => {
    const { service, sessionModel } = setup();
    await expect(service.cancel(actor, String(SESSION), '   ', new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(new BadRequestException(AcademicsErrors.CANCEL_REASON_REQUIRED));
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('refuses sessions that already ended, were reported or were cancelled', async () => {
    const ended = setup();
    await expect(ended.service.cancel(actor, String(SESSION), 'x', new Date('2026-10-12T15:00:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED)
    );
    for (const status of [SessionStatus.COMPLETED, SessionStatus.CANCELLED]) {
      const run = setup();
      run.state.loadInOrg.mockResolvedValue(sessionDoc({ status }));
      await expect(run.service.cancel(actor, String(SESSION), 'x', new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(ConflictException);
    }
  });

  it('turns a lost race into a conflict', async () => {
    const { service, sessionModel } = setup();
    sessionModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
    await expect(service.cancel(actor, String(SESSION), 'x', new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.SESSION_CANCEL_NOT_ALLOWED)
    );
  });

  it('completes the group when the cancelled session was the last open one, without creating follow-ups', async () => {
    const { service, groupModel, followUpModel } = setup(0);
    await service.cancel(actor, String(SESSION), 'holiday', new Date('2026-10-12T13:00:00Z'));
    expect(groupModel.updateOne).toHaveBeenCalled();
    expect(followUpModel.bulkWrite).not.toHaveBeenCalled();
  });
});

describe('SessionCompletionService.sweepOverdue', () => {
  it('persists REPORT_PENDING for ended SCHEDULED sessions and returns how many changed', async () => {
    const { service, sessionModel } = setup();
    const now = new Date('2026-10-12T16:00:00Z');
    expect(await service.sweepOverdue(now)).toBe(3);
    expect(sessionModel.updateMany).toHaveBeenCalledWith(
      { status: SessionStatus.SCHEDULED, endsAt: { $lte: now } },
      { $set: { status: SessionStatus.REPORT_PENDING } }
    );
  });
});
