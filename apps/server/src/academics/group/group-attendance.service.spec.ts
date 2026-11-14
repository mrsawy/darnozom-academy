import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, GroupStudentStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupAttendanceService } from './group-attendance.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const GROUP = id(10);
const A = id(2);
const WITHDRAWN = id(4);
const actorOf = (roleName: Roles, _id = String(id(90))): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });

function setup(group: unknown = { _id: GROUP, name: 'G', teacherId: id(1), students: [{ studentId: A }, { studentId: WITHDRAWN, status: GroupStudentStatus.WITHDRAWN }] }) {
  const groupModel = { findOne: jest.fn().mockReturnValue(mockQuery(group)) };
  const sessionModel = {
    find: jest.fn().mockReturnValue(
      mockQuery([
        {
          _id: id(11),
          sequence: 1,
          startsAt: new Date('2026-01-01T10:00:00Z'),
          endsAt: new Date('2026-01-01T11:00:00Z'),
          status: SessionStatus.COMPLETED,
          teacherAttendance: AttendanceStatus.PRESENT,
          attendance: [{ studentId: A, status: AttendanceStatus.PRESENT }],
        },
      ])
    ),
  };
  const userModel = { find: jest.fn().mockReturnValue(mockQuery([{ _id: A, firstName: 'Amal', lastName: 'K' }])) };
  const service = new GroupAttendanceService(groupModel as never, sessionModel as never, userModel as never);
  return { service, groupModel, sessionModel, userModel };
}

describe('GroupAttendanceService.matrix', () => {
  it('builds the matrix for organization staff, for active students only, scoped to the organization', async () => {
    const { service, groupModel } = setup();
    const result = await service.matrix(actorOf(Roles.SUPERVISOR), String(GROUP));
    expect(groupModel.findOne.mock.calls[0][0]).toMatchObject({ _id: GROUP, organizationId: new Types.ObjectId(ORG) });
    expect(result.students.map((s) => s.studentId)).toEqual([String(A)]);
    expect(result.students[0]).toMatchObject({ name: 'Amal K', attendedRate: 1 });
    expect(result.teacherAttendedRate).toBe(1);
  });

  it("limits a teacher to their own groups", async () => {
    const { service, groupModel } = setup();
    await service.matrix(actorOf(Roles.INSTRUCTOR, String(id(1))), String(GROUP));
    expect(groupModel.findOne.mock.calls[0][0]).toMatchObject({ teacherId: id(1) });
  });

  it('404s when the group is outside the caller scope', async () => {
    const { service } = setup(null);
    await expect(service.matrix(actorOf(Roles.INSTRUCTOR), String(GROUP))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
  });

  it('never serves students or parents, and does not query for them', async () => {
    const { service, groupModel } = setup();
    for (const role of [Roles.STUDENT, Roles.PARENT]) {
      await expect(service.matrix(actorOf(role), String(GROUP))).rejects.toThrow(NotFoundException);
    }
    expect(groupModel.findOne).not.toHaveBeenCalled();
  });
});
