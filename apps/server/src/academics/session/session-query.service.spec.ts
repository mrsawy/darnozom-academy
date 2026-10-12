import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, GroupStudentStatus, ParentErrors, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionQueryService } from './session-query.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const CHILD_A = id(2);
const CHILD_B = id(3);
const WITHDRAWN = id(4);
const GROUP = id(10);
const SESSION = id(11);

const actorOf = (roleName: Roles, _id = String(id(90)), additionalRoles: Roles[] = []): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles });

const lean = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  organizationId: new Types.ObjectId(ORG),
  groupId: GROUP,
  teacherId: TEACHER,
  sequence: 1,
  startsAt: new Date('2026-10-12T10:00:00Z'),
  endsAt: new Date('2026-10-12T11:00:00Z'),
  status: SessionStatus.COMPLETED,
  attendance: [
    { studentId: CHILD_A, status: AttendanceStatus.PRESENT, note: 'on time', markedBy: TEACHER, markedAt: new Date() },
    { studentId: CHILD_B, status: AttendanceStatus.ABSENT, note: 'sick', markedBy: TEACHER, markedAt: new Date() },
  ],
  report: {
    evaluations: [
      { studentId: CHILD_A, participation: 5, understanding: 5, behavior: 5, homework: 5, note: 'great' },
      { studentId: CHILD_B, participation: 1, understanding: 1, behavior: 1, homework: 1, note: 'struggling' },
    ],
    summary: 'class summary',
    submittedBy: TEACHER,
    submittedAt: new Date('2026-10-12T11:30:00Z'),
  },
  ...over,
});

function setup() {
  const sessionModel = { find: jest.fn(), findOne: jest.fn() };
  const groupModel = { find: jest.fn(), findOne: jest.fn() };
  const userModel = { find: jest.fn(), findOne: jest.fn() };
  const parentService = { validateParentChildLink: jest.fn().mockResolvedValue(undefined) };
  groupModel.find.mockReturnValue(mockQuery([{ _id: GROUP, name: 'Group A' }]));
  userModel.find.mockReturnValue(mockQuery([]));
  const service = new SessionQueryService(sessionModel as never, groupModel as never, userModel as never, parentService as never);
  return { service, sessionModel, groupModel, userModel, parentService };
}

describe('SessionQueryService.findAll', () => {
  it('scopes organization staff by organizationId and applies the requested filters before it', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([]));
    await service.findAll(actorOf(Roles.COORDINATOR), { groupId: String(GROUP), from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z' });
    const filter = sessionModel.find.mock.calls[0][0];
    expect(filter.$and[0]).toEqual({ groupId: GROUP, startsAt: { $gte: new Date('2026-10-01T00:00:00Z'), $lt: new Date('2026-11-01T00:00:00Z') } });
    expect(filter.$and[2]).toEqual({ organizationId: new Types.ObjectId(ORG) });
  });

  it("limits a teacher to their own sessions even when another teacher's id is requested", async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([]));
    await service.findAll(actorOf(Roles.INSTRUCTOR, String(TEACHER)), { teacherId: String(id(77)) });
    const filter = sessionModel.find.mock.calls[0][0];
    expect(filter.$and[2]).toEqual({ teacherId: TEACHER });
  });

  it('matches the derived status: REPORT_PENDING also finds ended SCHEDULED sessions', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([]));
    await service.findAll(actorOf(Roles.COORDINATOR), { status: SessionStatus.REPORT_PENDING });
    expect(sessionModel.find.mock.calls[0][0].$and[1].$or).toHaveLength(2);
  });

  it('reports the effective status and the group name', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([lean({ status: SessionStatus.SCHEDULED, report: null, endsAt: new Date(Date.now() - 60_000) })]));
    const [view] = await service.findAll(actorOf(Roles.COORDINATOR), {});
    expect(view.status).toBe(SessionStatus.REPORT_PENDING);
    expect(view.groupName).toBe('Group A');
  });

  it("a parent receives only their own child's rows and never the class summary", async () => {
    const { service, sessionModel, groupModel, userModel, parentService } = setup();
    userModel.findOne.mockReturnValue(mockQuery({ childUsersIds: [CHILD_A] }));
    groupModel.find.mockReturnValueOnce(mockQuery([{ _id: GROUP }])).mockReturnValue(mockQuery([{ _id: GROUP, name: 'Group A' }]));
    sessionModel.find.mockReturnValue(mockQuery([lean()]));
    const parent = actorOf(Roles.PARENT);
    const [view] = await service.findAll(parent, { childId: String(CHILD_A) });

    expect(parentService.validateParentChildLink).toHaveBeenCalledWith(new Types.ObjectId(parent._id), CHILD_A);
    expect(view.attendance.map((a) => String(a.studentId))).toEqual([String(CHILD_A)]);
    expect(view.report?.evaluations.map((e) => String(e.studentId))).toEqual([String(CHILD_A)]);
    expect(view.report?.summary).toBeUndefined();
    const text = JSON.stringify(view);
    expect(text).not.toContain('struggling');
    expect(text).not.toContain('sick');
    expect(String(sessionModel.find.mock.calls[0][0].$and[2].groupId.$in[0])).toBe(String(GROUP));
  });

  it("rejects a parent asking for another family's child before reading any session", async () => {
    const { service, sessionModel, parentService } = setup();
    parentService.validateParentChildLink.mockRejectedValue(new ForbiddenException(ParentErrors.CHILD_NOT_LINKED));
    await expect(service.findAll(actorOf(Roles.PARENT), { childId: String(CHILD_B) })).rejects.toThrow(ParentErrors.CHILD_NOT_LINKED);
    expect(sessionModel.find).not.toHaveBeenCalled();
  });

  it('an accountant sees attendance without notes and no evaluations', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([lean()]));
    const [view] = await service.findAll(actorOf(Roles.ACCOUNTANT), {});
    expect(view.attendance).toHaveLength(2);
    expect(view.attendance.every((a) => a.note === undefined)).toBe(true);
    expect(view.report?.evaluations).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('class summary');
  });

  it('shows the full session to its own teacher even when they are also an accountant', async () => {
    const { service, sessionModel } = setup();
    sessionModel.find.mockReturnValue(mockQuery([lean()]));
    const [view] = await service.findAll(actorOf(Roles.ACCOUNTANT, String(TEACHER), [Roles.INSTRUCTOR]), {});
    expect(view.report?.evaluations).toHaveLength(2);
  });

  it('returns nothing for roles with no session scope', async () => {
    const { service, sessionModel } = setup();
    expect(await service.findAll(actorOf(Roles.HR), {})).toEqual([]);
    expect(sessionModel.find).not.toHaveBeenCalled();
  });
});

describe('SessionQueryService.findOne', () => {
  it('404s when the session is outside the actor scope', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.findOne(actorOf(Roles.COORDINATOR), String(SESSION))).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
    await expect(service.findOne(actorOf(Roles.HR), String(SESSION))).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
  });

  it('builds the roster from ACTIVE students only and names everyone involved', async () => {
    const { service, sessionModel, groupModel, userModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(lean()));
    groupModel.findOne.mockReturnValue(
      mockQuery({
        name: 'Group A',
        students: [
          { studentId: CHILD_A, status: GroupStudentStatus.ACTIVE },
          { studentId: CHILD_B },
          { studentId: WITHDRAWN, status: GroupStudentStatus.WITHDRAWN },
        ],
      })
    );
    userModel.find.mockReturnValue(mockQuery([{ _id: CHILD_A, firstName: 'Amal', lastName: 'K' }]));
    const view = await service.findOne(actorOf(Roles.COORDINATOR), String(SESSION));
    expect(view.roster).toEqual([String(CHILD_A), String(CHILD_B)]);
    expect(view.people[String(CHILD_A)]).toBe('Amal K');
    expect(view.groupName).toBe('Group A');
  });

  it('limits a family roster to their own child', async () => {
    const { service, sessionModel, groupModel, userModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(lean()));
    groupModel.find.mockReturnValue(mockQuery([{ _id: GROUP }]));
    groupModel.findOne.mockReturnValue(mockQuery({ name: 'Group A', students: [{ studentId: CHILD_A }, { studentId: CHILD_B }] }));
    userModel.find.mockReturnValue(mockQuery([]));
    const view = await service.findOne(actorOf(Roles.STUDENT, String(CHILD_A)), String(SESSION));
    expect(view.roster).toEqual([String(CHILD_A)]);
  });
});
