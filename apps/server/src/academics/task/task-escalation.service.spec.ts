import { AtRiskReason, ReadinessKey, TaskStatus, TASK_ESCALATION_HOURS } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskEscalationService } from './task-escalation.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const COORDINATOR = new Types.ObjectId();
const SUPERVISOR = new Types.ObjectId();
const NOW = new Date('2026-03-10T12:00:00.000Z');
const NEXT_DUE = new Date('2026-03-11T12:00:00.000Z');

const overdueTask = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  organizationId: ORG,
  groupId: GROUP,
  readinessKey: ReadinessKey.MEETING_LINK,
  milestoneDays: 3,
  assigneeId: COORDINATOR,
  escalationLevel: 0,
  dueAt: new Date('2026-03-09T12:00:00.000Z'),
  status: TaskStatus.OPEN,
  ...overrides,
});

const makeService = (tasks: Record<string, unknown>[], groupOverrides: Record<string, unknown> = {}) => {
  const taskModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => tasks }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({
      select: () => ({
        lean: () => ({
          exec: async () => [
            { _id: GROUP, organizationId: ORG, name: 'Group A', coordinatorId: COORDINATOR, supervisorId: SUPERVISOR, ...groupOverrides },
          ],
        }),
      }),
    })),
  };
  const notifications = { taskAssigned: jest.fn().mockResolvedValue(null), taskEscalated: jest.fn().mockResolvedValue(null) };
  const users = { managerIdsInOrg: jest.fn(async () => ['m1', 'm2']) };
  const risk = { flag: jest.fn().mockResolvedValue(null), refresh: jest.fn().mockResolvedValue(null) };
  const service = new TaskEscalationService(taskModel as never, groupModel as never, notifications as never, users as never, risk as never);
  return { service, taskModel, notifications, users, risk };
};

describe('TaskEscalationService.run', () => {
  it('escalates a level-0 task to the supervisor and resets the clock', async () => {
    const { service, taskModel, notifications } = makeService([overdueTask()]);
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(update.$set).toEqual({ escalationLevel: 1, assigneeId: SUPERVISOR, dueAt: NEXT_DUE });
    expect(notifications.taskEscalated).toHaveBeenCalledWith(expect.anything(), 'Group A', [String(SUPERVISOR)]);
  });

  it('skips the supervisor level when the group has none', async () => {
    const { service, taskModel, notifications, users, risk } = makeService([overdueTask()], { supervisorId: null });
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(update.$set).toEqual({ escalationLevel: 2, assigneeId: null, dueAt: NEXT_DUE });
    expect(users.managerIdsInOrg).toHaveBeenCalledWith(ORG);
    expect(notifications.taskEscalated).toHaveBeenCalledWith(expect.anything(), 'Group A', ['m1', 'm2']);
    expect(risk.flag).toHaveBeenCalledWith(GROUP, AtRiskReason.TASK_ESCALATED, NOW);
  });

  it('escalates a level-1 task to the manager queue and flags the group at risk', async () => {
    const { service, taskModel, risk } = makeService([overdueTask({ escalationLevel: 1, assigneeId: SUPERVISOR })]);
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(update.$set).toEqual({ escalationLevel: 2, assigneeId: null, dueAt: NEXT_DUE });
    expect(risk.flag).toHaveBeenCalledWith(GROUP, AtRiskReason.TASK_ESCALATED, NOW);
  });

  it('leaves a level-2 task where it is', async () => {
    const { service, taskModel, notifications } = makeService([overdueTask({ escalationLevel: 2, assigneeId: null })]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(taskModel.updateOne).not.toHaveBeenCalled();
    expect(notifications.taskEscalated).not.toHaveBeenCalled();
  });

  it('reassigns rather than escalates when the coordinator seat changed hands', async () => {
    const newCoordinator = new Types.ObjectId();
    const { service, taskModel, notifications } = makeService([overdueTask()], { coordinatorId: newCoordinator });
    await expect(service.run(NOW)).resolves.toBe(1);
    const [, update] = taskModel.updateOne.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(update.$set).toEqual({ assigneeId: newCoordinator, dueAt: NEXT_DUE });
    expect(notifications.taskAssigned).toHaveBeenCalledWith(expect.anything(), 'Group A', [String(newCoordinator)]);
  });

  it('flags the group and escalates when the coordinator seat is now empty', async () => {
    const { service, taskModel, risk } = makeService([overdueTask()], { coordinatorId: null });
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(risk.flag).toHaveBeenCalledWith(GROUP, AtRiskReason.NO_COORDINATOR, NOW);
    const [, upd2] = taskModel.updateOne.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(upd2.$set['escalationLevel']).toBe(1);
  });

  it('does nothing when no task is overdue', async () => {
    const { service, taskModel } = makeService([]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(taskModel.updateOne).not.toHaveBeenCalled();
  });

  it('escalates exactly one level even when the task is days overdue', async () => {
    const { service, taskModel } = makeService([overdueTask({ dueAt: new Date('2026-03-01T00:00:00.000Z') })]);
    await service.run(NOW);
    expect(taskModel.updateOne).toHaveBeenCalledTimes(1);
    const [, upd] = taskModel.updateOne.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(upd.$set['escalationLevel']).toBe(1);
  });

  it('reads the escalation window from the shared constant', () => {
    expect(TASK_ESCALATION_HOURS).toBe(24);
  });
});
