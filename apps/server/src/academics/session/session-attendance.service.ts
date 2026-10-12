import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AttendanceStatus, GROUP_EDITOR_ROLES, hasAnyRole, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { checkAttendanceWindow } from '../domain/session-rules';
import { Session } from './entities/session.entity';
import { SessionStateService } from './session-state.service';
import { SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface AttendanceEntryInput {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

@Injectable()
export class SessionAttendanceService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    private readonly state: SessionStateService
  ) {}

  /** Student attendance: the session's teacher or a group editor, from 15 minutes before the start until the report is submitted. */
  async markStudents(actor: AcademicsActor, id: string, entries: AttendanceEntryInput[], now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    const isTeacher = String(session.teacherId) === actor._id;
    if (!isTeacher && !hasAnyRole(actor, GROUP_EDITOR_ROLES)) throw new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER);

    const windowError = checkAttendanceWindow(session, now);
    if (windowError) throw new ConflictException(windowError);

    const active = await this.state.activeStudentIds(session.groupId);
    const ids = entries.map((entry) => entry.studentId);
    if (new Set(ids).size !== ids.length || ids.some((studentId) => !active.includes(studentId))) {
      throw new BadRequestException(AcademicsErrors.ATTENDANCE_STUDENT_INVALID);
    }

    const incoming = entries.map((entry) => ({
      studentId: oid(entry.studentId),
      status: entry.status,
      ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
      markedBy: oid(actor._id),
      markedAt: now,
    }));
    const kept = session.attendance.filter((row) => !ids.includes(String(row.studentId)));
    const $set: Record<string, unknown> = { attendance: [...kept, ...incoming] };
    // Assumption A1: the teacher recording student attendance means the teacher was present, unless someone already set it.
    if (isTeacher && session.teacherAttendance == null) $set.teacherAttendance = AttendanceStatus.PRESENT;

    const result = await this.sessionModel
      .updateOne({ _id: session._id, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } }, { $set })
      .exec();
    if (result.matchedCount === 0) throw new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED);
    return this.state.reload(session._id, now);
  }

  /** Teacher attendance is set by group editors (the controller requires UPDATE GROUP). */
  async markTeacher(actor: AcademicsActor, id: string, status: AttendanceStatus, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    if (session.status === SessionStatus.CANCELLED) throw new ConflictException(AcademicsErrors.ATTENDANCE_CLOSED);
    await this.sessionModel.updateOne({ _id: session._id }, { $set: { teacherAttendance: status } }).exec();
    return this.state.reload(session._id, now);
  }
}
