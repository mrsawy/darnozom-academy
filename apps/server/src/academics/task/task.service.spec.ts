import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, GroupPaymentStatus, GroupStudentStatus, ReadinessKey, Roles, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskService } from './task.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const TASK = new Types.ObjectId();
const ME = new Types.ObjectId();

const actor = (overrides: Record<string, unknown> = {}) => ({
  _id: String(ME),
  organizationId: String(ORG),
  roleName: Roles.COORDINATOR,
  additionalRoles: [] as Roles[],
  ...overrides,
});

const task = (overrides: Record<string, unknown> = {}) => ({
  _id: TASK,
  organizationId: ORG,
  groupId: GROUP,
  readinessKey: ReadinessKey.MEETING_LINK,
  milestoneDays: 3,
  assigneeId: ME,
  escalationLevel: 0,
  dueAt: new Date('2026-03-11T00:00:00.000Z'),
  status: TaskStatus.OPEN,
  ...overrides,
});

/** A group where MEETING_LINK is done and CONTENT_SENT is not. */
const groupDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: GROUP,
  organizationId: ORG,
  name: 'Group A',
  teacherId: new Types.ObjectId(),
  minStudents: 1,
  students: [{ studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
  contentSent: { done: false },
  meetingLink: 'https://meet.example/abc',
  ...overrides,
});

const makeService = (tasks: Record<string, unknown>[], group: Record<string, unknown> | null = groupDoc()) => {
  const taskModel = {
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => tasks }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => tasks[0] ?? null }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => (group ? [group] : []) }) }) })),
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => group }) })),
  };
  const risk = { refresh: jest.fn().mockResolvedValue(null), flag: jest.fn().mockResolvedValue(null) };
  return { service: new TaskService(taskModel as never, groupModel as never, risk as never), taskModel, groupModel, risk };
};

describe('TaskService.findMine', () => {
  it("returns the caller's own open tasks with the group name attached", async () => {
    const { service, taskModel } = makeService([task()]);
    const result = await service.findMine(actor(), { status: TaskStatus.OPEN });
    expect(result[0].groupName).toBe('Group A');
    const [filter] = taskModel.find.mock.calls[0] as unknown[] as [Record<string, unknown>];
    expect(filter['$or']).toEqual([{ assigneeId: ME }]);
  });

  it('includes the manager queue for a manager', async () => {
    const { service, taskModel } = makeService([task({ assigneeId: null, escalationLevel: 2 })]);
    await service.findMine(actor({ roleName: Roles.MANAGER }), {});
    const [filter] = taskModel.find.mock.calls[0] as unknown[] as [Record<string, unknown>];
    expect(filter['$or']).toEqual([{ assigneeId: ME }, { assigneeId: null }]);
  });

  it('includes the manager queue for someone holding MANAGER as an additional role', async () => {
    const { service, taskModel } = makeService([task()]);
    await service.findMine(actor({ roleName: Roles.SECRETARY, additionalRoles: [Roles.MANAGER] }), {});
    const [filter] = taskModel.find.mock.calls[0] as unknown[] as [Record<string, unknown>];
    expect(filter['$or']).toContainEqual({ assigneeId: null });
  });

  it("scopes every read to the caller's organization", async () => {
    const { service, taskModel } = makeService([task()]);
    await service.findMine(actor(), {});
    const [filter] = taskModel.find.mock.calls[0] as unknown[] as [Record<string, unknown>];
    expect(filter['organizationId']).toEqual(ORG);
  });

  it('filters by group when asked', async () => {
    const { service, taskModel } = makeService([task()]);
    await service.findMine(actor(), { groupId: String(GROUP) });
    const [filter] = taskModel.find.mock.calls[0] as unknown[] as [Record<string, unknown>];
    expect(filter['groupId']).toEqual(GROUP);
  });
});

describe('TaskService.markDone', () => {
  it('closes the task when its readiness item is actually done', async () => {
    const { service, taskModel, risk } = makeService([task()]);
    await service.markDone(actor(), String(TASK));
    expect(taskModel.updateOne).toHaveBeenCalledWith(
      { _id: TASK, status: TaskStatus.OPEN },
      { $set: { status: TaskStatus.DONE, closedAt: expect.any(Date), closedReason: TaskClosedReason.ITEM_DONE } }
    );
    expect(risk.refresh).toHaveBeenCalled();
  });

  it('refuses to close a task whose item is still missing', async () => {
    const { service, taskModel } = makeService([task({ readinessKey: ReadinessKey.CONTENT_SENT })]);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(new ConflictException(AcademicsErrors.READINESS_ITEM_STILL_MISSING));
    expect(taskModel.updateOne).not.toHaveBeenCalled();
  });

  it('refuses when the caller is neither the assignee nor a manager', async () => {
    const { service } = makeService([task({ assigneeId: new Types.ObjectId() })]);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(new ForbiddenException(AcademicsErrors.TASK_NOT_ASSIGNED_TO_YOU));
  });

  it('lets any manager close a task sitting in the manager queue', async () => {
    const { service, taskModel } = makeService([task({ assigneeId: null, escalationLevel: 2 })]);
    await service.markDone(actor({ roleName: Roles.MANAGER }), String(TASK));
    expect(taskModel.updateOne).toHaveBeenCalled();
  });

  it('404s on a task from another organization', async () => {
    const { service } = makeService([]);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(new NotFoundException(AcademicsErrors.TASK_NOT_FOUND));
  });

  it("404s when the task's group has vanished", async () => {
    const { service } = makeService([task()], null);
    await expect(service.markDone(actor(), String(TASK))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
  });
});
