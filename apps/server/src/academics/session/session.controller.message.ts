import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { UpdateFollowUpPayload } from '../follow-up/dto/follow-up.dto';
import { FollowUpService } from '../follow-up/follow-up.service';
import {
  CancelSessionPayload,
  CreateSessionPayload,
  FindSessionsPayload,
  MarkAttendancePayload,
  ReportPayload,
  RescheduleSessionPayload,
  TeacherAttendancePayload,
} from './dto/session.dto';
import { GroupStartService } from './group-start.service';
import { SessionAttendanceService } from './session-attendance.service';
import { SessionCompletionService } from './session-completion.service';
import { SessionQueryService } from './session-query.service';
import { SessionReportService } from './session-report.service';

@Controller()
@ApplyRpcErrorHandling
export class SessionControllerMessage {
  constructor(
    private readonly groupStart: GroupStartService,
    private readonly queries: SessionQueryService,
    private readonly attendance: SessionAttendanceService,
    private readonly completion: SessionCompletionService,
    private readonly reports: SessionReportService,
    private readonly followUps: FollowUpService
  ) {}

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.start')
  start(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupStart.start(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateSessionPayload, @Ctx() context: IUserContext) {
    return this.completion.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.reschedule')
  reschedule(@Payload(new RpcValidationPipe()) payload: RescheduleSessionPayload, @Ctx() context: IUserContext) {
    return this.completion.reschedule(actorFromContext(context), payload.id, payload.startsAt, payload.endsAt);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.delete')
  delete(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.completion.delete(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindSessionsPayload, @Ctx() context: IUserContext) {
    return this.queries.findAll(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.queries.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.cancel')
  cancel(@Payload(new RpcValidationPipe()) payload: CancelSessionPayload, @Ctx() context: IUserContext) {
    return this.completion.cancel(actorFromContext(context), payload.id, payload.reason);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.markAttendance')
  markAttendance(@Payload(new RpcValidationPipe()) payload: MarkAttendancePayload, @Ctx() context: IUserContext) {
    return this.attendance.markStudents(actorFromContext(context), payload.id, payload.entries);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.sessions.markTeacherAttendance')
  markTeacherAttendance(@Payload(new RpcValidationPipe()) payload: TeacherAttendancePayload, @Ctx() context: IUserContext) {
    return this.attendance.markTeacher(actorFromContext(context), payload.id, payload.status);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.submitReport')
  submitReport(@Payload(new RpcValidationPipe()) payload: ReportPayload, @Ctx() context: IUserContext) {
    return this.reports.submit(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.editReport')
  editReport(@Payload(new RpcValidationPipe()) payload: ReportPayload, @Ctx() context: IUserContext) {
    return this.reports.edit(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.followUps.list')
  listFollowUps(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.followUps.list(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.followUps.update')
  updateFollowUp(@Payload(new RpcValidationPipe()) payload: UpdateFollowUpPayload, @Ctx() context: IUserContext) {
    return this.followUps.update(actorFromContext(context), payload.id, payload.data);
  }
}
