import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, GroupStatus, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { TeacherAvailabilityService } from './teacher-availability.service';

const teacher: AcademicsActor = { _id: '64b0000000000000000000a1', organizationId: '64b0000000000000000000bb', roleName: Roles.INSTRUCTOR, additionalRoles: [] };
const cohortId = '64b0000000000000000000c1';

function setup() {
  const availabilityModel = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
  const groupModel = { find: jest.fn() };
  const cohortModel = { find: jest.fn() };
  const service = new TeacherAvailabilityService(availabilityModel as never, groupModel as never, cohortModel as never);
  return { service, availabilityModel, groupModel, cohortModel };
}

const monday9to12 = { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] };

describe('TeacherAvailabilityService', () => {
  it('returns an empty availability when none is saved', async () => {
    const { service, availabilityModel } = setup();
    availabilityModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.getMine(teacher)).resolves.toEqual({ teacherId: teacher._id, timezone: null, slots: [] });
  });

  it('only lets instructors save availability', async () => {
    const { service } = setup();
    await expect(service.putMine({ ...teacher, roleName: Roles.COORDINATOR }, monday9to12)).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_AN_INSTRUCTOR));
  });

  it('rejects invalid slots', async () => {
    const { service } = setup();
    await expect(service.putMine(teacher, { timezone: 'UTC', slots: [{ dayOfWeek: 1, startTime: '12:00', endTime: '09:00' }] })).rejects.toThrow(new BadRequestException(AcademicsErrors.INVALID_AVAILABILITY));
  });

  it('rejects availability that no longer covers an assigned group, naming the group', async () => {
    const { service, groupModel, cohortModel, availabilityModel } = setup();
    groupModel.find.mockReturnValue(mockQuery([
      { _id: 'g1', name: 'Group A', timezone: 'UTC', cohortId, status: GroupStatus.FORMING, schedule: [{ dayOfWeek: 2, startTime: '10:00', durationMinutes: 60 }] },
    ]));
    cohortModel.find.mockReturnValue(mockQuery([{ _id: cohortId, startDate: new Date('2027-01-04T00:00:00Z') }]));
    await expect(service.putMine(teacher, monday9to12)).rejects.toThrow(new ConflictException(`${AcademicsErrors.AVAILABILITY_CONFLICTS_WITH_GROUPS}|Group A`));
    expect(availabilityModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('saves availability that still covers every assigned group', async () => {
    const { service, groupModel, cohortModel, availabilityModel } = setup();
    groupModel.find.mockReturnValue(mockQuery([
      { _id: 'g1', name: 'Group A', timezone: 'UTC', cohortId, status: GroupStatus.FORMING, schedule: [{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }] },
    ]));
    cohortModel.find.mockReturnValue(mockQuery([{ _id: cohortId, startDate: new Date('2027-01-04T00:00:00Z') }]));
    availabilityModel.findOneAndUpdate.mockReturnValue(mockQuery({ teacherId: teacher._id, ...monday9to12 }));
    await expect(service.putMine(teacher, monday9to12)).resolves.toEqual({ teacherId: teacher._id, ...monday9to12 });
    expect(availabilityModel.findOneAndUpdate.mock.calls[0][2]).toMatchObject({ upsert: true });
  });

  it('hides other teachers availability from non-staff', async () => {
    const { service } = setup();
    await expect(service.getForTeacher(teacher, '64b0000000000000000000a2')).rejects.toThrow(new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION));
  });
});
