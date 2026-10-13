import { AtRiskReason, GroupPaymentStatus, GroupStatus, GroupStudentStatus, ReadinessKey, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskGenerationService } from './task-generation.service';

const oid = () => new Types.ObjectId();

const ORG = oid();
const COORDINATOR = oid();

/** A group missing MEETING_LINK and CONTENT_SENT; everything else is done. */
const groupDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: oid(),
  organizationId: ORG,
  cohortId: oid(),
  name: 'Group A',
  teacherId: oid(),
  coordinatorId: COORDINATOR,
  supervisorId: null,
  timezone: 'Africa/Cairo',
  minStudents: 1,
  maxStudents: 10,
  students: [{ studentId: oid(), paymentStatus: GroupPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
  contentSent: { done: false },
  meetingLink: null,
  status: GroupStatus.FORMING,
  ...overrides,
});

const makeService = (groups: Record<string, unknown>[], startDate: Date, existingOpen: Record<string, unknown>[] = []) => {
  const created: Record<string, unknown>[] = [];
  const taskModel = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      const clash = [...created, ...existingOpen].some(
        (t) => String(t.groupId) === String(doc.groupId) && t.readinessKey === doc.readinessKey && t.status === TaskStatus.OPEN
      );
      if (clash) {
        const error = new Error('E11000 duplicate key') as Error & { code: number };
        error.code = 11_000;
        throw error;
      }
      created.push({ ...doc, _id: oid(), status: TaskStatus.OPEN });
      return created.at(-1);
    }),
    find: jest.fn(() => ({ lean: () => ({ exec: async () => existingOpen }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const groupModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => groups }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const cohortModel = {
    find: jest.fn(() => ({ lean: () => ({ exec: async () => groups.map((g) => ({ _id: g.cohortId, startDate })) }) })),
  };
  const notifications = { taskAssigned: jest.fn().mockResolvedValue(null), taskEscalated: jest.fn().mockResolvedValue(null) };
  const users = { managerIdsInOrg: jest.fn(async () => []) };
  const risk = { flag: jest.fn().mockResolvedValue(null), refresh: jest.fn().mockResolvedValue(null) };
  const service = new TaskGenerationService(
    taskModel as never,
    groupModel as never,
    cohortModel as never,
    notifications as never,
    users as never,
    risk as never
  );
  return { service, taskModel, groupModel, notifications, created, risk };
};

const START = new Date('2026-03-15T00:00:00.000Z');

describe('TaskGenerationService.run', () => {
  it('creates nothing before the first milestone', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await expect(service.run(new Date('2026-03-01T00:00:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(0);
  });

  it('creates one task per missing readiness item at the 7-day milestone', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(2);
    expect(created.map((t) => t.readinessKey).toSorted()).toEqual([ReadinessKey.CONTENT_SENT, ReadinessKey.MEETING_LINK].toSorted());
    expect(created.every((t) => t.milestoneDays === 7)).toBe(true);
    expect(created.every((t) => String(t.assigneeId) === String(COORDINATOR))).toBe(true);
    expect(created.every((t) => t.escalationLevel === 0)).toBe(true);
  });

  it('sets dueAt 24 hours after creation', async () => {
    const now = new Date('2026-03-08T09:00:00.000Z');
    const { service, created } = makeService([groupDoc()], START);
    await service.run(now);
    expect((created[0].dueAt as Date).toISOString()).toBe('2026-03-09T09:00:00.000Z');
  });

  it('creates no task for an item that is already done', async () => {
    const { service, created } = makeService([groupDoc({ contentSent: { done: true }, meetingLink: 'https://meet.example/abc' })], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(0);
  });

  it('creates exactly one task per item for a start date already in the past, at the most urgent milestone', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await expect(service.run(new Date('2026-04-01T00:00:00.000Z'))).resolves.toBe(2);
    expect(created.every((t) => t.milestoneDays === 1)).toBe(true);
  });

  it('swallows the duplicate-key error so a second sweep creates nothing', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await service.run(new Date('2026-03-08T00:00:00.000Z'));
    await expect(service.run(new Date('2026-03-08T00:10:00.000Z'))).resolves.toBe(0);
    expect(created).toHaveLength(2);
  });

  it('recreates a task after its item was done and then broke again', async () => {
    const { service, created } = makeService([groupDoc()], START);
    await service.run(new Date('2026-03-08T00:00:00.000Z'));
    // The coordinator sent the content, the task closed, then the upload was removed.
    created.forEach((t) => {
      if (t.readinessKey === ReadinessKey.CONTENT_SENT) t.status = TaskStatus.DONE;
    });
    await expect(service.run(new Date('2026-03-09T00:00:00.000Z'))).resolves.toBe(1);
    expect(created.filter((t) => t.readinessKey === ReadinessKey.CONTENT_SENT)).toHaveLength(2);
  });

  it('skips a group whose timezone cannot be read and still processes the rest', async () => {
    const broken = groupDoc({ timezone: 'Mars/Olympus' });
    const healthy = groupDoc();
    const { service, created } = makeService([broken, healthy], START);
    await expect(service.run(new Date('2026-03-08T00:00:00.000Z'))).resolves.toBe(2);
    expect(created.every((t) => String(t.groupId) === String(healthy._id))).toBe(true);
  });

  it('flags a group with no coordinator at risk and creates no tasks', async () => {
    const now = new Date('2026-03-08T00:00:00.000Z');
    const doc = groupDoc({ coordinatorId: null });
    const { service, created, risk } = makeService([doc], START);
    await expect(service.run(now)).resolves.toBe(0);
    expect(created).toHaveLength(0);
    expect(risk.flag).toHaveBeenCalledWith(doc._id, AtRiskReason.NO_COORDINATOR, now);
  });

  it('notifies the coordinator once per created task', async () => {
    const { service, notifications } = makeService([groupDoc()], START);
    await service.run(new Date('2026-03-08T00:00:00.000Z'));
    expect(notifications.taskAssigned).toHaveBeenCalledTimes(2);
    expect(notifications.taskAssigned).toHaveBeenCalledWith(expect.objectContaining({ readinessKey: expect.any(String) }), 'Group A', [
      String(COORDINATOR),
    ]);
  });
});
