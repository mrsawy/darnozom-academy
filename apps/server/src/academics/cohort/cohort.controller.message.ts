import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CohortService } from './cohort.service';
import { CreateCohortDto, FindCohortsPayload, UpdateCohortPayload } from './dto/cohort.dto';

@Controller()
@ApplyRpcErrorHandling
export class CohortControllerMessage {
  constructor(private readonly cohortService: CohortService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindCohortsPayload, @Ctx() context: IUserContext) {
    return this.cohortService.findAll(actorFromContext(context), payload.levelId);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.cohortService.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateCohortDto, @Ctx() context: IUserContext) {
    return this.cohortService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateCohortPayload, @Ctx() context: IUserContext) {
    return this.cohortService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.COHORT })
  @MessagePattern('academics.cohorts.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.cohortService.remove(actorFromContext(context), payload.id);
  }
}
