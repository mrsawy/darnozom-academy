import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, PresenceRole, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { TeacherOverviewService } from './teacher-overview.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const GROUP = id(10);
const SESSION = id(11);
const actorOf = (roleName: Roles, _id = String(id(90))): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });
const day = (h: number, m = 0) => new Date(Date.UTC(2026, 0, 5, h, m));

function setup(user: unknown = { _id: TEACHER, firstName: 'Omar', lastName: 'S', email: 'o@x.com', roleName: Roles.INSTRUCTOR, additionalRoles: [] }) {
  const userModel = { findOne: jest.fn().mockReturnValue(mockQuery(user)) };
  const groupModel = { find: jest.fn().mockReturnValue(mockQuery([{ _id: GROUP, name: 'Group A', status: 'RUNNING', students: [{ studentId: id(2) }, { studentId: id(3), status: 'WITHDRAWN' }] }])) };
  const sessionModel = {
    find: jest.fn().mockReturnValue(
      mockQuery([
        { _id: SESSION, groupId: GROUP, sequence: 1, startsAt: day(10), endsAt: day(11), status: SessionStatus.COMPLETED, teacherAttendance: AttendanceStatus.PRESENT, report: { submittedAt: day(12) } },
      ])
    ),
  };
  const presenceModel = {
    find: jest.fn().mockReturnValue(
      mockQuery([{ sessionId: SESSION, role: PresenceRole.TEACHER, firstJoinedAt: day(10, 6), lastSeenAt: day(11), segments: [{ joinedAt: day(10, 6), leftAt: day(11) }] }])
    ),
  };
  const evaluationModel = {
    find: jest.fn().mockReturnValue(
      mockQuery([
        { _id: id(50), sessionId: SESSION, commitment: 5, teaching: 4, pedagogy: 3, contentAdherence: 2, technicalQuality: 1, createdAt: day(12) },
        { _id: id(51), sessionId: SESSION, commitment: 3, teaching: 4, pedagogy: 5, contentAdherence: 4, technicalQuality: 5, createdAt: day(13) },
      ])
    ),
  };
  const service = new TeacherOverviewService(userModel as never, groupModel as never, sessionModel as never, presenceModel as never, evaluationModel as never);
  return { service, userModel, groupModel, sessionModel, presenceModel, evaluationModel };
}

const now = new Date('2026-02-01T00:00:00Z');

describe('TeacherOverviewService.overview', () => {
  it('assembles profile, groups, stats, evaluation averages and recent sessions for a supervisor', async () => {
    const { service } = setup();
    const result = await service.overview(actorOf(Roles.SUPERVISOR), { id: String(TEACHER) }, now);

    expect(result.teacher).toMatchObject({ id: String(TEACHER), name: 'Omar S', email: 'o@x.com' });
    expect(result.groups).toEqual([{ id: String(GROUP), name: 'Group A', status: 'RUNNING', activeStudents: 1 }]);
    expect(result.stats).toMatchObject({ total: 1, completed: 1, reportsMissing: 0, avgJoinDelayMinutes: 6, avgReportDelayHours: 1 });
    expect(result.stats.attendance.PRESENT).toBe(1);
    expect(result.evaluations.count).toBe(2);
    expect(result.evaluations.averages).toEqual({ commitment: 4, teaching: 4, pedagogy: 4, contentAdherence: 3, technicalQuality: 3 });
    expect(result.recentSessions[0]).toMatchObject({ id: String(SESSION), groupName: 'Group A', reportSubmitted: true, joinedMinutes: 54 });
  });

  it('scopes every query to the organization and the teacher', async () => {
    const { service, sessionModel, userModel, evaluationModel, presenceModel } = setup();
    await service.overview(actorOf(Roles.ADMIN), { id: String(TEACHER) }, now);
    expect(userModel.findOne.mock.calls[0][0]).toMatchObject({ _id: TEACHER, organizationId: new Types.ObjectId(ORG) });
    expect(sessionModel.find.mock.calls[0][0]).toMatchObject({ teacherId: TEACHER, organizationId: new Types.ObjectId(ORG) });
    expect(evaluationModel.find.mock.calls[0][0]).toMatchObject({ teacherId: TEACHER, organizationId: new Types.ObjectId(ORG) });
    expect(presenceModel.find.mock.calls[0][0]).toMatchObject({ userId: TEACHER, organizationId: new Types.ObjectId(ORG) });
  });

  it('applies the optional date range to the session start', async () => {
    const { service, sessionModel } = setup();
    await service.overview(actorOf(Roles.ADMIN), { id: String(TEACHER), from: '2026-01-01', to: '2026-02-01' }, now);
    expect(sessionModel.find.mock.calls[0][0].startsAt).toEqual({ $gte: new Date('2026-01-01'), $lt: new Date('2026-02-01') });
  });

  it('lets a teacher read their own page but not another teacher’s', async () => {
    const own = setup();
    await expect(own.service.overview(actorOf(Roles.INSTRUCTOR, String(TEACHER)), { id: String(TEACHER) }, now)).resolves.toBeDefined();
    const other = setup();
    await expect(other.service.overview(actorOf(Roles.INSTRUCTOR), { id: String(TEACHER) }, now)).rejects.toThrow(new ForbiddenException(AcademicsErrors.TEACHER_ACCESS_DENIED));
    expect(other.userModel.findOne).not.toHaveBeenCalled();
  });

  it('refuses students, parents, accountants and HR before touching the database', async () => {
    for (const role of [Roles.STUDENT, Roles.PARENT, Roles.ACCOUNTANT, Roles.HR]) {
      const { service, userModel } = setup();
      await expect(service.overview(actorOf(role), { id: String(TEACHER) }, now)).rejects.toThrow(ForbiddenException);
      expect(userModel.findOne).not.toHaveBeenCalled();
    }
  });

  it('404s when the user is not found in the organization or is not an instructor', async () => {
    const missing = setup(null);
    await expect(missing.service.overview(actorOf(Roles.ADMIN), { id: String(TEACHER) }, now)).rejects.toThrow(new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION));
    const student = setup({ _id: TEACHER, firstName: 'A', lastName: 'B', roleName: Roles.STUDENT, additionalRoles: [] });
    await expect(student.service.overview(actorOf(Roles.ADMIN), { id: String(TEACHER) }, now)).rejects.toThrow(NotFoundException);
  });

  it('returns null averages when there are no evaluations', async () => {
    const { service, evaluationModel } = setup();
    evaluationModel.find.mockReturnValue(mockQuery([]));
    const result = await service.overview(actorOf(Roles.ADMIN), { id: String(TEACHER) }, now);
    expect(result.evaluations).toEqual({ count: 0, averages: null, recent: [] });
  });
});
