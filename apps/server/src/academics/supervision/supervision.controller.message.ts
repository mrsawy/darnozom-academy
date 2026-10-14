import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CreateEvaluationPayload, FindEvaluationsPayload, UpdateEvaluationPayload } from './dto/supervision.dto';
import { SupervisionService } from './supervision.service';

@Controller()
@ApplyRpcErrorHandling
export class SupervisionControllerMessage {
  constructor(private readonly supervision: SupervisionService) {}

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateEvaluationPayload, @Ctx() context: IUserContext) {
    const { sessionId, ...scores } = payload;
    return this.supervision.create(actorFromContext(context), sessionId, scores);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateEvaluationPayload, @Ctx() context: IUserContext) {
    return this.supervision.update(actorFromContext(context), payload.id, payload.data);
  }

  /** READ, because a teacher reads their own; the service narrows the scope by role. */
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.list')
  list(@Payload(new RpcValidationPipe()) payload: FindEvaluationsPayload, @Ctx() context: IUserContext) {
    return this.supervision.findAll(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION_EVALUATION })
  @MessagePattern('academics.supervision.listForSession')
  listForSession(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.supervision.findForSession(actorFromContext(context), payload.id);
  }
}
