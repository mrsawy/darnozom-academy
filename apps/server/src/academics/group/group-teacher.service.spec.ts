import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStatus, Roles, TeacherFitReason } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupTeacherService } from './group-teacher.service';

const ORG = '64b0000000000000000000bb';
const staff: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const groupId = new Types.ObjectId('64b000000000000000000011');
const teacherId = new Types.ObjectId('64b0000000000000000000a1');
const cohortId = new Types.ObjectId('64b000000000000000000022');
const WINTER = new Date('2027-01-04T00:00:00Z');

const group = (over: Record<string, unknown> = {}) => ({
  _id: groupId, cohortId, status: GroupStatus.FORMING, teacherId: null, timezone: 'UTC', students: [],
  schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }], ...over,
});
const instructor = { _id: teacherId, firstName: 'Amina', lastName: 'K', roleName: Roles.INSTRUCTOR, additionalRoles: [] };
const mondayMorning = { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] };

function setup() {
  const groupModel = { find: jest.fn(), updateOne: jest.fn() };
  const userModel = { find: jest.fn(), findOne: jest.fn() };
  const availabilityModel = { find: jest.fn(), findOne: jest.fn() };
  const cohortModel = { findOne: jest.fn() };
  const state = { loadInOrg: jest.fn(), loadForWrite: jest.fn(), syncReadiness: jest.fn(async (id) => ({ _id: id })) };
  const service = new GroupTeacherService(groupModel as never, userModel as never, availabilityModel as never, cohortModel as never, state as never);
  return { service, groupModel, userModel, availabilityModel, cohortModel, state };
}

describe('GroupTeacherService', () => {
  it('404s a teacher outside the organization', async () => {
    const { service, state, userModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    userModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.assign(staff, String(groupId), String(teacherId))).rejects.toThrow(new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION));
    expect(String(userModel.findOne.mock.calls[0][0].organizationId)).toBe(ORG);
  });

  it('refuses a teacher without availability', async () => {
    const { service, state, userModel, availabilityModel, groupModel, cohortModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery(null));
    groupModel.find.mockReturnValue(mockQuery([]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    await expect(service.assign(staff, String(groupId), String(teacherId))).rejects.toThrow(new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE));
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('assigns a fitting teacher, excluding the group itself from conflicts', async () => {
    const { service, state, userModel, availabilityModel, groupModel, cohortModel } = setup();
    state.loadForWrite.mockResolvedValue(group());
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery(mondayMorning));
    groupModel.find.mockReturnValue(mockQuery([]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));

    await service.assign(staff, String(groupId), String(teacherId));

    expect(groupModel.find.mock.calls[0][0]._id).toEqual({ $ne: groupId });
    expect(groupModel.updateOne.mock.calls[0][1]).toEqual({ $set: { teacherId } });
    expect(state.syncReadiness).toHaveBeenCalledWith(groupId);
  });

  it('lists instructors (including additional-role instructors) with fit and reasons', async () => {
    const { service, state, userModel, availabilityModel, groupModel, cohortModel } = setup();
    state.loadInOrg.mockResolvedValue(group());
    const secondId = new Types.ObjectId();
    userModel.find.mockReturnValue(mockQuery([instructor, { _id: secondId, firstName: 'Omar', lastName: 'S', roleName: Roles.SUPERVISOR, additionalRoles: [Roles.INSTRUCTOR] }]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    availabilityModel.findOne.mockImplementation((filter) => mockQuery(String(filter.teacherId) === String(teacherId) ? mondayMorning : null));
    groupModel.find.mockReturnValue(mockQuery([]));

    const result = await service.candidates(staff, String(groupId));

    expect(userModel.find.mock.calls[0][0].$or).toEqual([{ roleName: Roles.INSTRUCTOR }, { additionalRoles: Roles.INSTRUCTOR }]);
    expect(result).toEqual([
      { teacherId: String(teacherId), name: 'Amina K', ok: true, reasons: [] },
      { teacherId: String(secondId), name: 'Omar S', ok: false, reasons: [TeacherFitReason.NO_AVAILABILITY] },
    ]);
  });

  it('blocks a schedule change that moves outside the assigned teacher availability', async () => {
    const { service, userModel, availabilityModel, groupModel, cohortModel } = setup();
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery(mondayMorning));
    groupModel.find.mockReturnValue(mockQuery([]));
    cohortModel.findOne.mockReturnValue(mockQuery({ startDate: WINTER }));
    await expect(
      service.assertScheduleChangeFits(staff, group({ teacherId }) as never, { schedule: [{ dayOfWeek: 2, startTime: '10:00', durationMinutes: 60 }], timezone: 'UTC' })
    ).rejects.toThrow(new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE));
  });

  it('skips the schedule re-check when no teacher is assigned', async () => {
    const { service, userModel } = setup();
    await expect(service.assertScheduleChangeFits(staff, group() as never, { schedule: [], timezone: 'UTC' })).resolves.toBeUndefined();
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('blocks a cohort start date whose DST offset breaks an assigned group', async () => {
    const { service, userModel, availabilityModel, groupModel } = setup();
    // Group Sun 11:00 Riyadh = 08:00 UTC; teacher Sun 09:00–12:00 London: fits in summer, not in winter.
    groupModel.find
      .mockReturnValueOnce(mockQuery([group({ teacherId, timezone: 'Asia/Riyadh', schedule: [{ dayOfWeek: 0, startTime: '11:00', durationMinutes: 60 }] })]))
      .mockReturnValue(mockQuery([]));
    userModel.findOne.mockReturnValue(mockQuery(instructor));
    availabilityModel.findOne.mockReturnValue(mockQuery({ timezone: 'Europe/London', slots: [{ dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }] }));
    await expect(service.assertCohortStartDateFits(staff, cohortId, WINTER)).rejects.toThrow(new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE));
  });
});
