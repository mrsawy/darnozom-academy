import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionAttendanceService } from './session-attendance.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const A = id(2);
const B = id(3);
const WITHDRAWN = id(4);
const SESSION = id(11);
const GROUP = id(10);
const START = new Date('2026-10-12T14:00:00Z');
const during = new Date('2026-10-12T14:10:00Z');

const actorOf = (roleName: Roles, _id = String(id(90))): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });
const teacher = actorOf(Roles.INSTRUCTOR, String(TEACHER));
const coordinator = actorOf(Roles.COORDINATOR);

const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  groupId: GROUP,
  teacherId: TEACHER,
  startsAt: START,
  endsAt: new Date('2026-10-12T15:00:00Z'),
  status: SessionStatus.SCHEDULED,
  teacherAttendance: null,
  attendance: [],
  ...over,
});

function setup(session = sessionDoc()) {
  const sessionModel = { updateOne: jest.fn().mockReturnValue(mockQuery({ matchedCount: 1, modifiedCount: 1 })) };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(session),
    activeStudentIds: jest.fn().mockResolvedValue([String(A), String(B)]), // WITHDRAWN student is not listed
    reload: jest.fn().mockResolvedValue({ reloaded: true }),
  };
  return { service: new SessionAttendanceService(sessionModel as never, state as never), sessionModel, state };
}

const entry = (studentId: Types.ObjectId, status = AttendanceStatus.PRESENT, note?: string) => ({ studentId: String(studentId), status, ...(note ? { note } : {}) });

describe('SessionAttendanceService.markStudents', () => {
  it("records the rows and defaults the teacher's own attendance to PRESENT", async () => {
    const { service, sessionModel } = setup();
    await service.markStudents(teacher, String(SESSION), [entry(A), entry(B, AttendanceStatus.LATE, ' bus ')], during);
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } });
    expect(update.$set.teacherAttendance).toBe(AttendanceStatus.PRESENT);
    expect(update.$set.attendance).toEqual([
      { studentId: A, status: AttendanceStatus.PRESENT, markedBy: TEACHER, markedAt: during },
      { studentId: B, status: AttendanceStatus.LATE, note: 'bus', markedBy: TEACHER, markedAt: during },
    ]);
  });

  it('does not touch teacherAttendance when staff record attendance or it is already set', async () => {
    const staffRun = setup();
    await staffRun.service.markStudents(coordinator, String(SESSION), [entry(A)], during);
    expect(staffRun.sessionModel.updateOne.mock.calls[0][1].$set.teacherAttendance).toBeUndefined();

    const setRun = setup(sessionDoc({ teacherAttendance: AttendanceStatus.LATE }));
    await setRun.service.markStudents(teacher, String(SESSION), [entry(A)], during);
    expect(setRun.sessionModel.updateOne.mock.calls[0][1].$set.teacherAttendance).toBeUndefined();
  });

  it('keeps rows for students not in this request and replaces re-marked ones', async () => {
    const existing = [
      { studentId: A, status: AttendanceStatus.ABSENT, markedBy: TEACHER, markedAt: START },
      { studentId: B, status: AttendanceStatus.PRESENT, markedBy: TEACHER, markedAt: START },
    ];
    const { service, sessionModel } = setup(sessionDoc({ attendance: existing }));
    await service.markStudents(teacher, String(SESSION), [entry(A, AttendanceStatus.EXCUSED)], during);
    const written = sessionModel.updateOne.mock.calls[0][1].$set.attendance;
    expect(written).toHaveLength(2);
    expect(written.find((r: { studentId: Types.ObjectId }) => String(r.studentId) === String(B)).status).toBe(AttendanceStatus.PRESENT);
    expect(written.find((r: { studentId: Types.ObjectId }) => String(r.studentId) === String(A)).status).toBe(AttendanceStatus.EXCUSED);
  });

  it("only the session's teacher or a group editor may record attendance", async () => {
    const { service, sessionModel } = setup();
    await expect(service.markStudents(actorOf(Roles.INSTRUCTOR), String(SESSION), [entry(A)], during)).rejects.toThrow(
      new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER)
    );
    await expect(service.markStudents(actorOf(Roles.ACCOUNTANT), String(SESSION), [entry(A)], during)).rejects.toThrow(ForbiddenException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('is closed before the 15-minute window, after the report, and for cancelled sessions', async () => {
    const early = setup();
    await expect(early.service.markStudents(teacher, String(SESSION), [entry(A)], new Date('2026-10-12T13:44:00Z'))).rejects.toThrow(
      new ConflictException(AcademicsErrors.ATTENDANCE_NOT_OPEN)
    );
    const done = setup(sessionDoc({ status: SessionStatus.COMPLETED }));
    await expect(done.service.markStudents(teacher, String(SESSION), [entry(A)], during)).rejects.toThrow(new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED));
    const cancelled = setup(sessionDoc({ status: SessionStatus.CANCELLED }));
    await expect(cancelled.service.markStudents(teacher, String(SESSION), [entry(A)], during)).rejects.toThrow(new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED));
  });

  it('ignores withdrawn students: they and strangers cannot be marked, nor can a student appear twice', async () => {
    const { service, sessionModel } = setup();
    await expect(service.markStudents(teacher, String(SESSION), [entry(WITHDRAWN)], during)).rejects.toThrow(
      new BadRequestException(AcademicsErrors.ATTENDANCE_STUDENT_INVALID)
    );
    await expect(service.markStudents(teacher, String(SESSION), [entry(id(99))], during)).rejects.toThrow(BadRequestException);
    await expect(service.markStudents(teacher, String(SESSION), [entry(A), entry(A, AttendanceStatus.LATE)], during)).rejects.toThrow(BadRequestException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });

  it('closes the race with a submitted report: the guarded update matching nothing is ATTENDANCE_CLOSED', async () => {
    const { service, sessionModel } = setup();
    sessionModel.updateOne.mockReturnValue(mockQuery({ matchedCount: 0, modifiedCount: 0 }));
    await expect(service.markStudents(teacher, String(SESSION), [entry(A)], during)).rejects.toThrow(new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED));
  });
});

describe('SessionAttendanceService.markTeacher', () => {
  it("sets the teacher's attendance, also after the report was submitted", async () => {
    const { service, sessionModel } = setup(sessionDoc({ status: SessionStatus.COMPLETED }));
    await service.markTeacher(coordinator, String(SESSION), AttendanceStatus.ABSENT, during);
    expect(sessionModel.updateOne).toHaveBeenCalledWith({ _id: SESSION }, { $set: { teacherAttendance: AttendanceStatus.ABSENT } });
  });

  it('refuses a cancelled session', async () => {
    const { service, sessionModel } = setup(sessionDoc({ status: SessionStatus.CANCELLED }));
    await expect(service.markTeacher(coordinator, String(SESSION), AttendanceStatus.PRESENT, during)).rejects.toThrow(
      new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED)
    );
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
  });
});
