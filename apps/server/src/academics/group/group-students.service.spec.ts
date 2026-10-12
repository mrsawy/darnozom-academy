import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupPaymentStatus, GroupStatus, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupStudentsService } from './group-students.service';

const ORG = '64b0000000000000000000bb';
const staff: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const studentId = '64b000000000000000000055';
const existingStudent = new Types.ObjectId('64b000000000000000000066');

const group = (over: Record<string, unknown> = {}) => ({
  _id: groupId, status: GroupStatus.FORMING, maxStudents: 2, students: [{ studentId: existingStudent, paymentStatus: GroupPaymentStatus.UNPAID }], ...over,
});

function setup() {
  const groupModel = { findOne: jest.fn(), updateOne: jest.fn() };
  const userModel = { find: jest.fn(), findOne: jest.fn() };
  const state = { loadInOrg: jest.fn(), loadForWrite: jest.fn(), syncReadiness: jest.fn(async (id) => ({ _id: id })) };
  const service = new GroupStudentsService(groupModel as never, userModel as never, state as never);
  return { service, groupModel, userModel, state };
}

describe('GroupStudentsService', () => {
  describe('studentCandidates', () => {
    it('escapes regex characters in the search text', async () => {
      const { service, state, userModel } = setup();
      state.loadInOrg.mockResolvedValue(group());
      userModel.find.mockReturnValue(mockQuery([]));
      await expect(service.studentCandidates(staff, String(groupId), '(a.*')).resolves.toEqual([]);
      const filter = userModel.find.mock.calls[0][0];
      const regex: RegExp = filter.$or[0].firstName;
      expect(regex.test('(a.*')).toBe(true);
      expect(regex.test('abc')).toBe(false);
    });

    it('only returns organization students not already in the group, at most 20', async () => {
      const { service, state, userModel } = setup();
      state.loadInOrg.mockResolvedValue(group());
      const query = mockQuery([]);
      userModel.find.mockReturnValue(query);
      await service.studentCandidates(staff, String(groupId));
      const filter = userModel.find.mock.calls[0][0];
      expect(filter.roleName).toBe(Roles.STUDENT);
      expect(String(filter.organizationId)).toBe(ORG);
      expect(filter._id.$nin).toEqual([existingStudent]);
      expect(filter.$or).toBeUndefined();
      expect(query.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('addStudent', () => {
    it('rejects users that are not students of the organization', async () => {
      const { service, state, userModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.addStudent(staff, String(groupId), studentId)).rejects.toThrow(new BadRequestException(AcademicsErrors.STUDENT_NOT_FOUND_IN_ORGANIZATION));
    });

    it('rejects a student already in the group', async () => {
      const { service, state, userModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery({ _id: existingStudent }));
      await expect(service.addStudent(staff, String(groupId), String(existingStudent))).rejects.toThrow(new ConflictException(AcademicsErrors.STUDENT_ALREADY_IN_GROUP));
    });

    it('rejects when the conditional push matches nothing because the group is full', async () => {
      const { service, state, userModel, groupModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery({ _id: new Types.ObjectId(studentId) }));
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
      groupModel.findOne.mockReturnValue(mockQuery(group({ students: [{ studentId: existingStudent }, { studentId: new Types.ObjectId() }] })));

      await expect(service.addStudent(staff, String(groupId), studentId)).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_FULL));
      const filter = groupModel.updateOne.mock.calls[0][0];
      expect(filter.$expr).toEqual({ $lt: [{ $size: '$students' }, '$maxStudents'] });
      expect(filter.status).toEqual({ $ne: GroupStatus.CANCELLED });
    });

    it('adds an unpaid student and re-evaluates readiness', async () => {
      const { service, state, userModel, groupModel } = setup();
      state.loadForWrite.mockResolvedValue(group());
      userModel.findOne.mockReturnValue(mockQuery({ _id: new Types.ObjectId(studentId) }));
      groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
      await service.addStudent(staff, String(groupId), studentId);
      const pushed = groupModel.updateOne.mock.calls[0][1].$push.students;
      expect(String(pushed.studentId)).toBe(studentId);
      expect(pushed.paymentStatus).toBe(GroupPaymentStatus.UNPAID);
      expect(pushed.whatsappAdded).toBe(false);
      expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
    });
  });

  it('404s removing a student who is not in the group', async () => {
    const { service, state } = setup();
    state.loadForWrite.mockResolvedValue(group());
    await expect(service.removeStudent(staff, String(groupId), studentId)).rejects.toThrow(new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP));
  });

  it('sets payment status with a positional update and re-evaluates readiness', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    groupModel.updateOne.mockReturnValue(mockQuery({ matchedCount: 1 }));
    await service.setPaymentStatus(staff, String(groupId), String(existingStudent), GroupPaymentStatus.PAID);
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter['students.studentId']).toEqual(existingStudent);
    expect(update).toEqual({ $set: { 'students.$.paymentStatus': GroupPaymentStatus.PAID } });
    expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
  });

  it('404s payment status for a student not in the group', async () => {
    const { service, state, groupModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    groupModel.updateOne.mockReturnValue(mockQuery({ matchedCount: 0 }));
    await expect(service.setPaymentStatus(staff, String(groupId), studentId, GroupPaymentStatus.PAID)).rejects.toThrow(new NotFoundException(AcademicsErrors.STUDENT_NOT_IN_GROUP));
  });
});
