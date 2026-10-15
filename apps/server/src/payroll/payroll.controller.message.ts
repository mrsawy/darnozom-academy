import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from '../role/permission.decorator';
import { RpcValidationPipe } from '../utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from '../utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from '../utils/types/IUserContext.interface';
import { actorFromContext } from '../academics/common/actor';
import { TeacherPayProfileService } from './services/teacher-pay-profile.service';
import { PayrollService } from './services/payroll.service';
import { SessionDisputeService } from './services/session-dispute.service';
import {
  AddBonusPayload,
  DisputeSessionPayload,
  FindStatementsPayload,
  GenerateStatementsPayload,
  MarkPaidPayload,
  ResolveDisputePayload,
  StatementIdPayload,
  TeacherIdPayload,
  UpsertProfilePayload,
} from './dto/payroll.dto';

@Controller()
@ApplyRpcErrorHandling
export class PayrollControllerMessage {
  constructor(
    private readonly profileService: TeacherPayProfileService,
    private readonly payrollService: PayrollService,
    private readonly disputeService: SessionDisputeService
  ) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.profiles.get')
  getProfile(@Payload(new RpcValidationPipe()) payload: TeacherIdPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.profileService.getProfileForTeacher(actor.organizationId, payload.teacherId);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.profiles.list')
  listProfiles(@Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.profileService.getProfiles(actor.organizationId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.profiles.upsert')
  upsertProfile(@Payload(new RpcValidationPipe()) payload: UpsertProfilePayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.profileService.upsertProfile(actor.organizationId, payload.teacherId, payload);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.statements.generate')
  generateStatements(@Payload(new RpcValidationPipe()) payload: GenerateStatementsPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.payrollService.generateStatements(actor.organizationId, payload.month);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.statements.find')
  findStatements(@Payload(new RpcValidationPipe()) payload: FindStatementsPayload = {}, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.payrollService.findStatements(actor.organizationId, payload, actor);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.statements.getById')
  getStatementById(@Payload(new RpcValidationPipe()) payload: StatementIdPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.payrollService.getStatementById(payload.id, actor);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.statements.addBonus')
  addBonus(@Payload(new RpcValidationPipe()) payload: AddBonusPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.payrollService.addBonus(payload.id, payload, actor._id);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.statements.approve')
  approveStatement(@Payload(new RpcValidationPipe()) payload: StatementIdPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.payrollService.approveStatement(payload.id, actor._id);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.PAYROLL })
  @MessagePattern('payroll.statements.markPaid')
  markPaid(@Payload(new RpcValidationPipe()) payload: MarkPaidPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.payrollService.markPaid(payload.id, payload, actor._id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.dispute')
  disputeSession(@Payload(new RpcValidationPipe()) payload: DisputeSessionPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.disputeService.disputeSession(payload.sessionId, payload.reason, actor);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.sessions.resolveDispute')
  resolveDispute(@Payload(new RpcValidationPipe()) payload: ResolveDisputePayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.disputeService.resolveDispute(payload.sessionId, actor);
  }
}
