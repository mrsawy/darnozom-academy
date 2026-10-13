import { GroupPaymentStatus, GroupStudentStatus, ReadinessKey, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskClosingService } from './task-closing.service';

const GROUP = new Types.ObjectId();
const NOW = new Date('2026-03-10T00:00:00.000Z');

const group = (overrides: Record<string, unknown> = {}) => ({
  _id: GROUP,
  teacherId: new Types.ObjectId(),
  minStudents: 1,
  students: [{ studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
  contentSent: { done: true },
  meetingLink: 'https://meet.example/abc',
  ...overrides,
});

const makeService = (modifiedCount = 1) => {
  const taskModel = { updateMany: jest.fn(() => ({ exec: async () => ({ modifiedCount }) })) };
  const risk = { refresh: jest.fn().mockResolvedValue(null), flag: jest.fn().mockResolvedValue(null) };
  return { service: new TaskClosingService(taskModel as never, risk as never), taskModel, risk };
};

describe('TaskClosingService.closeDoneItems', () => {
  it('closes the open tasks of items that are now done', async () => {
    const { service, taskModel } = makeService(2);
    await expect(service.closeDoneItems(group(), NOW)).resolves.toBe(2);
    expect(taskModel.updateMany).toHaveBeenCalledWith(
      { groupId: GROUP, status: TaskStatus.OPEN, readinessKey: { $in: Object.values(ReadinessKey) } },
      { $set: { status: TaskStatus.DONE, closedAt: NOW, closedReason: TaskClosedReason.ITEM_DONE } }
    );
  });

  it('closes only the done items, leaving a missing item open', async () => {
    const { service, taskModel } = makeService(1);
    await service.closeDoneItems(group({ meetingLink: null }), NOW);

    const [filter] = taskModel.updateMany.mock.calls[0] as unknown[] as [Record<string, { $in: string[] }>, ...unknown[]];
    expect(filter['readinessKey'].$in).not.toContain(ReadinessKey.MEETING_LINK);
    expect(filter['readinessKey'].$in).toContain(ReadinessKey.CONTENT_SENT);
  });

  it('writes nothing when every item is still missing', async () => {
    const { service, taskModel, risk } = makeService();
    const nothingDone = group({ teacherId: null, students: [], contentSent: { done: false }, meetingLink: null });
    await expect(service.closeDoneItems(nothingDone, NOW)).resolves.toBe(0);
    expect(taskModel.updateMany).not.toHaveBeenCalled();
    expect(risk.refresh).not.toHaveBeenCalled();
  });

  it('refreshes the at-risk flag after closing, so a cleared group stops being flagged', async () => {
    const { service, risk } = makeService(2);
    await service.closeDoneItems(group(), NOW);
    expect(risk.refresh).toHaveBeenCalledWith(GROUP, NOW);
  });
});

describe('TaskClosingService.closeAll', () => {
  it('cancels every open task when the group starts', async () => {
    const { service, taskModel } = makeService(3);
    await expect(service.closeAll(GROUP, TaskClosedReason.GROUP_STARTED, NOW)).resolves.toBe(3);
    expect(taskModel.updateMany).toHaveBeenCalledWith(
      { groupId: GROUP, status: TaskStatus.OPEN },
      { $set: { status: TaskStatus.CANCELLED, closedAt: NOW, closedReason: TaskClosedReason.GROUP_STARTED } }
    );
  });

  it('cancels every open task when the group is cancelled', async () => {
    const { service, taskModel } = makeService(1);
    await service.closeAll(GROUP, TaskClosedReason.GROUP_CANCELLED, NOW);

    const [, update] = taskModel.updateMany.mock.calls[0] as unknown[] as [unknown, { $set: Record<string, unknown> }];
    expect(update.$set['closedReason']).toBe(TaskClosedReason.GROUP_CANCELLED);
    expect(update.$set['status']).toBe(TaskStatus.CANCELLED);
  });

  it('refreshes the at-risk flag so a started group is not left flagged', async () => {
    const { service, risk } = makeService(2);
    await service.closeAll(GROUP, TaskClosedReason.GROUP_STARTED, NOW);
    expect(risk.refresh).toHaveBeenCalledWith(GROUP, NOW);
  });
});
