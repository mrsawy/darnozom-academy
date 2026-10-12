import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionReportService } from './session-report.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const A = id(2);
const B = id(3);
const WITHDRAWN = id(4);
const SESSION = id(11);
const GROUP = id(10);
const START = new Date('2026-10-12T14:00:00Z');
const after = new Date('2026-10-12T15:10:00Z');

const actorOf = (roleName: Roles, _id = String(id(90))): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });
const teacher = actorOf(Roles.INSTRUCTOR, String(TEACHER));

const marked = (studentId: Types.ObjectId) => ({ studentId, status: AttendanceStatus.PRESENT, markedBy: TEACHER, markedAt: START });
const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  organizationId: new Types.ObjectId(ORG),
  groupId: GROUP,
  teacherId: TEACHER,
  sequence: 1,
  startsAt: START,
  endsAt: new Date('2026-10-12T15:00:00Z'),
  status: SessionStatus.REPORT_PENDING,
  attendance: [marked(A), marked(B)],
  report: null,
  ...over,
});

const ev = (studentId: Types.ObjectId, score = 4, note?: string) => ({ studentId: String(studentId), participation: score, understanding: score, behavior: score, homework: score, ...(note ? { note } : {}) });

function setup(session = sessionDoc()) {
  const sessionModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(session),
    activeStudentIds: jest.fn().mockResolvedValue([String(A), String(B)]), // WITHDRAWN student is not active
    reload: jest.fn().mockResolvedValue({ reloaded: true }),
  };
  const completion = { onClosed: jest.fn().mockResolvedValue(undefined) };
  return { service: new SessionReportService(sessionModel as never, state as never, completion as never), sessionModel, state, completion };
}

describe('SessionReportService.submit', () => {
  it('stores the report, completes the session and triggers the completion hooks', async () => {
    const { service, sessionModel, completion } = setup();
    await service.submit(teacher, String(SESSION), { evaluations: [ev(A, 5, ' great '), ev(B, 2)], summary: ' good class ' }, after);
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } });
    expect(update.$set.status).toBe(SessionStatus.COMPLETED);
    expect(update.$set.report).toEqual({
      evaluations: [
        { studentId: A, participation: 5, understanding: 5, behavior: 5, homework: 5, note: 'great' },
        { studentId: B, participation: 2, understanding: 2, behavior: 2, homework: 2 },
      ],
      summary: 'good class',
      submittedBy: TEACHER,
      submittedAt: after,
    });
    expect(completion.onClosed).toHaveBeenCalledWith(expect.objectContaining({ _id: SESSION, status: SessionStatus.COMPLETED }), SessionStatus.COMPLETED);
  });

  it('may be submitted while still SCHEDULED once the class has started', async () => {
    const { service } = setup(sessionDoc({ status: SessionStatus.SCHEDULED }));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-12T14:30:00Z'))).resolves.toBeDefined();
  });

  it('is not open before the session starts', async () => {
    const { service, sessionModel } = setup(sessionDoc({ status: SessionStatus.SCHEDULED }));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-12T13:59:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_NOT_OPEN)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('only the session teacher may submit — not staff, not another teacher', async () => {
    const { service, sessionModel } = setup();
    await expect(service.submit(actorOf(Roles.COORDINATOR), String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER)
    );
    await expect(service.submit(actorOf(Roles.INSTRUCTOR), String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(ForbiddenException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects a second submission, including when two submissions race', async () => {
    const done = setup(sessionDoc({ status: SessionStatus.COMPLETED }));
    await expect(done.service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_ALREADY_SUBMITTED)
    );
    const race = setup();
    race.sessionModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 0 }));
    await expect(race.service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_ALREADY_SUBMITTED)
    );
    expect(race.completion.onClosed).not.toHaveBeenCalled();
  });

  it('needs attendance for every ACTIVE student first', async () => {
    const { service, sessionModel } = setup(sessionDoc({ attendance: [marked(A)] }));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.ATTENDANCE_INCOMPLETE)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('ignores withdrawn students: no attendance or evaluation is needed for them, and one cannot be added', async () => {
    const { service } = setup(sessionDoc({ attendance: [marked(A), marked(B)] })); // nothing recorded for WITHDRAWN
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).resolves.toBeDefined();
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A), ev(B), ev(WITHDRAWN)] }, after)).rejects.toThrow(
      new BadRequestException(AcademicsErrors.REPORT_INVALID)
    );
  });

  it('requires one in-range evaluation per student', async () => {
    const { service } = setup();
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A)] }, after)).rejects.toThrow(new BadRequestException(AcademicsErrors.REPORT_INVALID));
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A, 6), ev(B)] }, after)).rejects.toThrow(BadRequestException);
    await expect(service.submit(teacher, String(SESSION), { evaluations: [ev(A, 0), ev(B)] }, after)).rejects.toThrow(BadRequestException);
  });
});

describe('SessionReportService.edit', () => {
  const submittedAt = new Date('2026-10-12T15:30:00Z');
  const done = (over: Record<string, unknown> = {}) =>
    sessionDoc({
      status: SessionStatus.COMPLETED,
      report: {
        evaluations: [
          { studentId: A, participation: 3, understanding: 3, behavior: 3, homework: 3 },
          { studentId: WITHDRAWN, participation: 2, understanding: 2, behavior: 2, homework: 2 },
        ],
        submittedBy: TEACHER,
        submittedAt,
      },
      ...over,
    });

  it('replaces the evaluations within 24 hours and keeps who/when it was first submitted', async () => {
    const { service, sessionModel, completion } = setup(done());
    await service.edit(teacher, String(SESSION), { evaluations: [ev(A, 5), ev(B, 5), ev(WITHDRAWN, 2)], summary: 'updated' }, new Date('2026-10-13T10:00:00Z'));
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: SessionStatus.COMPLETED });
    expect(update.$set.report.submittedAt).toBe(submittedAt);
    expect(update.$set.report.submittedBy).toBe(TEACHER);
    expect(update.$set.report.summary).toBe('updated');
    expect(update.$set.report.evaluations).toHaveLength(3);
    expect(completion.onClosed).not.toHaveBeenCalled();
  });

  it('is closed after 24 hours', async () => {
    const { service, sessionModel } = setup(done());
    await expect(service.edit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-13T15:31:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_EDIT_WINDOW_CLOSED)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects edits by staff and by a session without a report', async () => {
    const staff = setup(done());
    await expect(staff.service.edit(actorOf(Roles.COORDINATOR), String(SESSION), { evaluations: [ev(A), ev(B)] }, new Date('2026-10-13T10:00:00Z'))).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER)
    );
    const none = setup();
    await expect(none.service.edit(teacher, String(SESSION), { evaluations: [ev(A), ev(B)] }, after)).rejects.toThrow(
      new ConflictException(AcademicsErrors.REPORT_NOT_SUBMITTED)
    );
  });

  it('still validates the evaluations', async () => {
    const { service } = setup(done());
    await expect(service.edit(teacher, String(SESSION), { evaluations: [ev(A, 9), ev(B)] }, new Date('2026-10-13T10:00:00Z'))).rejects.toThrow(BadRequestException);
  });
});
