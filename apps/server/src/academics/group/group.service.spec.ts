import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, ParentErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { computeReadiness } from '../domain/readiness';
import { GroupService } from './group.service';

const ORG = '64b0000000000000000000bb';
const staff: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const teacher: AcademicsActor = { _id: '64b0000000000000000000a1', organizationId: ORG, roleName: Roles.INSTRUCTOR, additionalRoles: [] };
const parent: AcademicsActor = { _id: '64b0000000000000000000a2', organizationId: ORG, roleName: Roles.PARENT, additionalRoles: [] };
const contentOfficer: AcademicsActor = { _id: '64b0000000000000000000a3', organizationId: ORG, roleName: Roles.CONTENT_OFFICER, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const cohortId = '64b000000000000000000022';
const levelId = new Types.ObjectId('64b000000000000000000033');
const courseId = new Types.ObjectId('64b000000000000000000044');

const baseGroup = (over: Record<string, unknown> = {}) => ({
  _id: groupId,
  organizationId: new Types.ObjectId(ORG),
  name: 'G',
  status: GroupStatus.FORMING,
  teacherId: null,
  minStudents: 1,
  maxStudents: 2,
  students: [],
  contentSent: { done: false },
  meetingLink: null,
  schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
  timezone: 'UTC',
  ...over,
});

const validDto = {
  cohortId,
  name: ' Group A ',
  schedule: [{ dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 }],
  timezone: 'Asia/Riyadh',
  minStudents: 3,
  maxStudents: 8,
  totalSessions: 12,
};

function setup() {
  const groupModel = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const cohortModel = { findOne: jest.fn() };
  const levelModel = { findOne: jest.fn() };
  const userModel = { findOne: jest.fn(), find: jest.fn() };
  const state = {
    toView: jest.fn(async (g) => ({ ...g, readiness: computeReadiness(g) })),
    withDerivedPaymentStatus: jest.fn(async (g) => g),
    loadInOrg: jest.fn(),
    loadForWrite: jest.fn(),
    syncReadiness: jest.fn(async (id) => ({ _id: id, synced: true })),
  };
  const parentService = { validateParentChildLink: jest.fn() };
  const groupTeacher = { assertScheduleChangeFits: jest.fn().mockResolvedValue() };
  const taskClosing = { closeDoneItems: jest.fn(async () => 0), closeAll: jest.fn(async () => 0) };
  const service = new GroupService(
    groupModel as never,
    cohortModel as never,
    levelModel as never,
    userModel as never,
    state as never,
    parentService as never,
    groupTeacher as never,
    taskClosing as never
  );
  return { service, groupModel, cohortModel, levelModel, userModel, state, parentService, groupTeacher };
}

describe('GroupService', () => {
  describe('create', () => {
    it('404s when the cohort is not in the organization', async () => {
      const { service, cohortModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.create(staff, validDto)).rejects.toThrow(new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND));
    });

    it('rejects an invalid schedule and max below min', async () => {
      const { service, cohortModel, levelModel, groupModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, levelId }));
      levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
      const overlapping = [
        { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 },
        { dayOfWeek: 1, startTime: '17:30', durationMinutes: 60 },
      ];
      await expect(service.create(staff, { ...validDto, schedule: overlapping })).rejects.toThrow(
        new BadRequestException(AcademicsErrors.INVALID_SCHEDULE)
      );
      await expect(service.create(staff, { ...validDto, minStudents: 5, maxStudents: 4 })).rejects.toThrow(
        new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS)
      );
      expect(groupModel.create).not.toHaveBeenCalled();
    });

    it('copies level and course from the cohort and returns readiness', async () => {
      const { service, cohortModel, levelModel, groupModel } = setup();
      cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, levelId }));
      levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
      groupModel.create.mockImplementation(async (doc) => ({
        toObject: () => ({ ...doc, _id: groupId, students: [], contentSent: { done: false }, status: GroupStatus.FORMING }),
      }));

      const view = await service.create(staff, validDto);

      const created = groupModel.create.mock.calls[0][0];
      expect(created.levelId).toBe(levelId);
      expect(created.courseId).toBe(courseId);
      expect(created.name).toBe('Group A');
      expect(view.readiness.ready).toBe(false);
    });
  });

  describe('read scoping', () => {
    it('forces teachers to their own groups even if another teacherId is requested', async () => {
      const { service, groupModel } = setup();
      groupModel.find.mockReturnValue(mockQuery([]));
      await service.findAll(teacher, { teacherId: '64b0000000000000000000ff' });
      expect(String(groupModel.find.mock.calls[0][0].teacherId)).toBe(teacher._id);
    });

    it('parent filtering by a child that is not theirs is rejected', async () => {
      const { service, parentService, groupModel } = setup();
      parentService.validateParentChildLink.mockRejectedValue(new ForbiddenException(ParentErrors.CHILD_NOT_LINKED));
      await expect(service.findAll(parent, { childId: '64b0000000000000000000c9' })).rejects.toThrow(
        new ForbiddenException(ParentErrors.CHILD_NOT_LINKED)
      );
      expect(groupModel.find).not.toHaveBeenCalled();
    });

    it('limits parents without a childId to their children', async () => {
      const { service, userModel, groupModel } = setup();
      const childIds = [new Types.ObjectId()];
      userModel.findOne.mockReturnValue(mockQuery({ childUsersIds: childIds }));
      groupModel.find.mockReturnValue(mockQuery([]));
      await service.findAll(parent, {});
      expect(groupModel.find.mock.calls[0][0]['students.studentId']).toEqual({ $in: childIds });
    });

    it('parents only see their own children entries and no status history', async () => {
      const { service, userModel, groupModel } = setup();
      const child = new Types.ObjectId();
      userModel.findOne.mockReturnValue(mockQuery({ childUsersIds: [child] }));
      groupModel.find.mockReturnValue(
        mockQuery([
          baseGroup({
            students: [
              { studentId: child, paymentStatus: GroupPaymentStatus.PAID },
              { studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.UNPAID },
            ],
            statusHistory: [{ to: GroupStatus.FORMING }],
          }),
        ])
      );
      const [view] = await service.findAll(parent, {});
      expect(view.students).toHaveLength(1);
      expect(String(view.students[0].studentId)).toBe(String(child));
      expect(view.statusHistory).toEqual([]);
    });

    it('returns display names for the teacher and visible students', async () => {
      const { service, groupModel, userModel } = setup();
      const teacherId = new Types.ObjectId();
      const studentId = new Types.ObjectId();
      groupModel.findOne.mockReturnValue(mockQuery(baseGroup({ teacherId, students: [{ studentId, paymentStatus: GroupPaymentStatus.UNPAID }] })));
      userModel.find.mockReturnValue(
        mockQuery([
          { _id: teacherId, firstName: 'Amina', lastName: 'K' },
          { _id: studentId, firstName: 'Sara' },
        ])
      );
      const view = await service.findOne(staff, String(groupId));
      expect(view.people).toEqual({ [String(teacherId)]: 'Amina K', [String(studentId)]: 'Sara' });
    });

    it('returns nothing for roles without group scope', async () => {
      const { service, groupModel } = setup();
      await expect(service.findAll(contentOfficer, {})).resolves.toEqual([]);
      expect(groupModel.find).not.toHaveBeenCalled();
    });

    it('404s a group of another organization for staff', async () => {
      const { service, groupModel } = setup();
      groupModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.findOne(staff, String(groupId))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
      expect(String(groupModel.findOne.mock.calls[0][0].organizationId)).toBe(ORG);
    });
  });

  describe('status', () => {
    it('refuses READY_TO_START while readiness items are missing', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup());
      await expect(service.markReady(staff, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_NOT_READY));
      expect(groupModel.updateOne).not.toHaveBeenCalled();
    });

    it('moves a ready group to READY_TO_START with history', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(
        baseGroup({
          teacherId: new Types.ObjectId(),
          students: [{ studentId: new Types.ObjectId(), paymentStatus: GroupPaymentStatus.PAID }],
          contentSent: { done: true },
          meetingLink: 'https://m.example/x',
        })
      );
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.markReady(staff, String(groupId));
      const [filter, update] = groupModel.updateOne.mock.calls[0];
      expect(filter).toEqual({ _id: groupId, status: GroupStatus.FORMING });
      expect(update.$set).toEqual({ status: GroupStatus.READY_TO_START });
      expect(update.$push.statusHistory).toMatchObject({ from: GroupStatus.FORMING, to: GroupStatus.READY_TO_START });
    });

    it('requires a reason to cancel', async () => {
      const { service, state } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup());
      await expect(service.cancel(staff, String(groupId), '  ')).rejects.toThrow(new BadRequestException(AcademicsErrors.CANCEL_REASON_REQUIRED));
    });

    it('cancels with the reason in history', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup());
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.cancel(staff, String(groupId), ' no teacher ');
      expect(groupModel.updateOne.mock.calls[0][1].$push.statusHistory).toMatchObject({ to: GroupStatus.CANCELLED, reason: 'no teacher' });
    });
  });

  describe('update and delete', () => {
    it('rejects maxStudents below the current number of students', async () => {
      const { service, state } = setup();
      state.loadForWrite.mockResolvedValue(baseGroup({ students: [{}, {}] }));
      await expect(service.update(staff, String(groupId), { maxStudents: 1, minStudents: 1 })).rejects.toThrow(
        new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS)
      );
    });

    it('re-checks teacher fit when the schedule or timezone changes', async () => {
      const { service, state, groupModel, groupTeacher } = setup();
      const group = baseGroup({ teacherId: new Types.ObjectId() });
      state.loadForWrite.mockResolvedValue(group);
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.update(staff, String(groupId), { timezone: 'Asia/Riyadh' });
      expect(groupTeacher.assertScheduleChangeFits).toHaveBeenCalledWith(staff, group, { schedule: group.schedule, timezone: 'Asia/Riyadh' });
    });

    it('does not re-check teacher fit for unrelated edits', async () => {
      const { service, state, groupModel, groupTeacher } = setup();
      state.loadForWrite.mockResolvedValue(baseGroup());
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.update(staff, String(groupId), { meetingLink: 'https://m.example/x' });
      expect(groupTeacher.assertScheduleChangeFits).not.toHaveBeenCalled();
      expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
    });

    it('only deletes forming or cancelled groups', async () => {
      const { service, state, groupModel } = setup();
      state.loadInOrg.mockResolvedValue(baseGroup({ status: GroupStatus.READY_TO_START }));
      await expect(service.remove(staff, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_DELETE_NOT_ALLOWED));
      expect(groupModel.updateOne).not.toHaveBeenCalled();
    });
  });

  it('records who marked content as sent and re-evaluates readiness', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(baseGroup());
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.setContentSent(staff, String(groupId), true);
    const set = groupModel.updateOne.mock.calls[0][1].$set.contentSent;
    expect(set.done).toBe(true);
    expect(String(set.by)).toBe(staff._id);
    expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
  });
});

describe('GroupService totalSessions and running locks', () => {
  it('create stores totalSessions', async () => {
    const { service, cohortModel, levelModel, groupModel } = setup();
    cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId, levelId }));
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
    groupModel.create.mockResolvedValue({ toObject: () => baseGroup({ totalSessions: 12 }) });
    await service.create(staff, validDto);
    expect(groupModel.create).toHaveBeenCalledWith(expect.objectContaining({ totalSessions: 12 }));
  });

  // eslint-disable-next-line unicorn/consistent-function-scoping -- builder local to this describe
  const running = (over = {}) =>
    baseGroup({
      status: GroupStatus.RUNNING,
      totalSessions: 12,
      timezone: 'UTC',
      schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
      ...over,
    });

  it('update rejects a real schedule, timezone or totalSessions change while RUNNING', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(running());
    await expect(service.update(staff, String(groupId), { timezone: 'Asia/Riyadh' })).rejects.toThrow(
      new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED)
    );
    await expect(service.update(staff, String(groupId), { schedule: [{ dayOfWeek: 2, startTime: '10:00', durationMinutes: 60 }] })).rejects.toThrow(
      new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED)
    );
    await expect(service.update(staff, String(groupId), { totalSessions: 20 })).rejects.toThrow(
      new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED)
    );
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('update accepts the unchanged schedule re-posted with another field and skips the teacher-fit re-check', async () => {
    const { service, state, groupModel, groupTeacher } = setup();
    state.loadForWrite.mockResolvedValue(running());
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await service.update(staff, String(groupId), {
      meetingLink: 'https://meet.example.com/x',
      timezone: 'UTC',
      schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }],
      totalSessions: 12,
    });
    expect(groupModel.updateOne).toHaveBeenCalled();
    expect(groupTeacher.assertScheduleChangeFits).not.toHaveBeenCalled();
  });

  it('update counts only ACTIVE students when lowering maxStudents', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(
      baseGroup({
        maxStudents: 3,
        students: [
          { studentId: new Types.ObjectId(), status: 'ACTIVE' },
          { studentId: new Types.ObjectId(), status: 'WITHDRAWN' },
          { studentId: new Types.ObjectId(), status: 'WITHDRAWN' },
        ],
      })
    );
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await expect(service.update(staff, String(groupId), { maxStudents: 1 })).resolves.toBeDefined();
  });
});
