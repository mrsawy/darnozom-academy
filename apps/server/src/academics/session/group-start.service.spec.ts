import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupStartService } from './group-start.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: String(ORG), roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const cohortId = new Types.ObjectId('64b000000000000000000022');
const teacherId = new Types.ObjectId('64b0000000000000000000a1');

const readyGroup = (over: Record<string, unknown> = {}) => ({
  _id: groupId,
  organizationId: ORG,
  cohortId,
  status: GroupStatus.READY_TO_START,
  teacherId,
  schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
  timezone: 'UTC',
  totalSessions: 3,
  ...over,
});

function setup(group = readyGroup()) {
  const dbSession = { withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()), endSession: jest.fn() };
  const connection = { startSession: jest.fn().mockResolvedValue(dbSession) };
  const groupModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const cohortModel = { findOne: jest.fn().mockReturnValue(mockQuery({ startDate: new Date('2026-10-12T00:00:00Z') })) };
  const sessionModel = { insertMany: jest.fn().mockResolvedValue([]) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(group),
    syncReadiness: jest.fn(async (id) => ({ _id: id, status: GroupStatus.RUNNING })),
  };
  const taskClosing = { closeDoneItems: jest.fn(async () => 0), closeAll: jest.fn(async () => 0) };
  const service = new GroupStartService(groupModel as never, cohortModel as never, sessionModel as never, connection as never, state as never, taskClosing as never);
  return { service, groupModel, cohortModel, sessionModel, state, dbSession, connection };
}

describe('GroupStartService', () => {
  it('moves the group to RUNNING and creates every session inside one transaction', async () => {
    const { service, groupModel, sessionModel, dbSession } = setup();
    await service.start(actor, String(groupId));

    const [filter, update, options] = groupModel.updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: groupId, status: GroupStatus.READY_TO_START });
    expect(update.$set).toEqual({ status: GroupStatus.RUNNING });
    expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.READY_TO_START, to: GroupStatus.RUNNING });
    expect(options).toEqual({ session: dbSession });

    const [docs, insertOptions] = sessionModel.insertMany.mock.calls[0];
    expect(insertOptions).toEqual({ session: dbSession });
    expect(docs.map((d: { sequence: number }) => d.sequence)).toEqual([1, 2, 3]);
    expect(docs.map((d: { startsAt: Date }) => d.startsAt.toISOString())).toEqual(['2026-10-12T10:00:00.000Z', '2026-10-19T10:00:00.000Z', '2026-10-26T10:00:00.000Z']);
    expect(docs[0]).toMatchObject({ organizationId: ORG, groupId, teacherId, status: SessionStatus.SCHEDULED, attendance: [] });
    expect(dbSession.endSession).toHaveBeenCalled();
  });

  it.each([
    [GroupStatus.FORMING, AcademicsErrors.GROUP_NOT_READY],
    [GroupStatus.RUNNING, AcademicsErrors.GROUP_NOT_READY],
    [GroupStatus.CANCELLED, AcademicsErrors.GROUP_CANCELLED],
    [GroupStatus.COMPLETED, AcademicsErrors.GROUP_COMPLETED],
  ])('refuses to start a %s group', async (status, error) => {
    const { service, sessionModel } = setup(readyGroup({ status }));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new ConflictException(error));
    expect(sessionModel.insertMany).not.toHaveBeenCalled();
  });

  it('asks for totalSessions on groups created before the field existed', async () => {
    const { service } = setup(readyGroup({ totalSessions: null }));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_TOTAL_SESSIONS_REQUIRED));
  });

  it('does not create sessions when the group is no longer READY_TO_START', async () => {
    const { service, groupModel, sessionModel, dbSession } = setup();
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_NOT_READY));
    expect(sessionModel.insertMany).not.toHaveBeenCalled();
    expect(dbSession.endSession).toHaveBeenCalled();
  });

  it('404s when the cohort is gone', async () => {
    const { service, cohortModel } = setup();
    cohortModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.start(actor, String(groupId))).rejects.toThrow(new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND));
  });
});
