import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CreateLevelDto, FindLevelsPayload, UpdateLevelPayload } from './dto/level.dto';
import { LevelService } from './level.service';

@Controller()
@ApplyRpcErrorHandling
export class LevelControllerMessage {
  constructor(private readonly levelService: LevelService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindLevelsPayload, @Ctx() context: IUserContext) {
    return this.levelService.findAll(actorFromContext(context), payload.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateLevelDto, @Ctx() context: IUserContext) {
    return this.levelService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateLevelPayload, @Ctx() context: IUserContext) {
    return this.levelService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.LEVEL })
  @MessagePattern('academics.levels.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.levelService.remove(actorFromContext(context), payload.id);
  }
}
