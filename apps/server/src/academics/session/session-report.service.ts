import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, SessionStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { checkReportEditable, checkReportOpen, missingAttendance, validateEvaluations } from '../domain/session-rules';
import { ReportDto } from './dto/session.dto';
import { Session } from './entities/session.entity';
import { SessionCompletionService } from './session-completion.service';
import { SessionStateService } from './session-state.service';
import { SessionLean, SessionView } from './session.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

function evaluationsOf(dto: ReportDto) {
  return dto.evaluations.map((entry) => ({
    studentId: oid(entry.studentId),
    participation: entry.participation,
    understanding: entry.understanding,
    behavior: entry.behavior,
    homework: entry.homework,
    ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
  }));
}

@Injectable()
export class SessionReportService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    private readonly state: SessionStateService,
    private readonly completion: SessionCompletionService
  ) {}

  private assertTeacher(actor: AcademicsActor, session: SessionLean) {
    if (String(session.teacherId) !== actor._id) throw new ForbiddenException(AcademicsErrors.NOT_SESSION_TEACHER);
  }

  /** The session's teacher submits once the class has started; attendance for every ACTIVE student must exist. */
  async submit(actor: AcademicsActor, id: string, dto: ReportDto, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    this.assertTeacher(actor, session);
    const openError = checkReportOpen(session, now);
    if (openError) throw new ConflictException(openError);

    const active = await this.state.activeStudentIds(session.groupId);
    if (missingAttendance(active, session.attendance).length > 0) throw new ConflictException(AcademicsErrors.ATTENDANCE_INCOMPLETE);
    const invalid = validateEvaluations(active, active, dto.evaluations);
    if (invalid) throw new BadRequestException(invalid);

    const report = {
      evaluations: evaluationsOf(dto),
      ...(dto.summary?.trim() ? { summary: dto.summary.trim() } : {}),
      submittedBy: oid(actor._id),
      submittedAt: now,
    };
    const result = await this.sessionModel
      .updateOne(
        { _id: session._id, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] } },
        { $set: { report, status: SessionStatus.COMPLETED } }
      )
      .exec();
    if (result.modifiedCount === 0) throw new ConflictException(AcademicsErrors.REPORT_ALREADY_SUBMITTED);

    await this.completion.onClosed({ ...session, status: SessionStatus.COMPLETED }, SessionStatus.COMPLETED);
    return this.state.reload(session._id, now);
  }

  /** The same teacher may correct the report for 24 hours after submitting it (the window is not extended by edits). */
  async edit(actor: AcademicsActor, id: string, dto: ReportDto, now: Date = new Date()): Promise<SessionView> {
    const session = await this.state.loadInOrg(actor, id);
    this.assertTeacher(actor, session);
    const editError = checkReportEditable(session, now);
    if (editError) throw new ConflictException(editError);
    const existing = session.report!;

    const active = await this.state.activeStudentIds(session.groupId);
    // Students withdrawn since the first submission keep their evaluation, but are not required.
    const allowed = [...new Set([...active, ...existing.evaluations.map((entry) => String(entry.studentId))])];
    const invalid = validateEvaluations(active, allowed, dto.evaluations);
    if (invalid) throw new BadRequestException(invalid);

    const report = {
      evaluations: evaluationsOf(dto),
      ...(dto.summary?.trim() ? { summary: dto.summary.trim() } : {}),
      submittedBy: existing.submittedBy,
      submittedAt: existing.submittedAt,
    };
    await this.sessionModel.updateOne({ _id: session._id, status: SessionStatus.COMPLETED }, { $set: { report } }).exec();
    return this.state.reload(session._id, now);
  }
}
