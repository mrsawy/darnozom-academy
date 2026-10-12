import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CancelGroupPayload, ContentSentPayload, CreateGroupDto, FindGroupsPayload, UpdateGroupPayload } from './dto/group.dto';
import { GroupService } from './group.service';

@Controller()
@ApplyRpcErrorHandling
export class GroupControllerMessage {
  constructor(private readonly groupService: GroupService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.findAll')
  findAll(@Payload(new RpcValidationPipe()) payload: FindGroupsPayload, @Ctx() context: IUserContext) {
    return this.groupService.findAll(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupService.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateGroupDto, @Ctx() context: IUserContext) {
    return this.groupService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateGroupPayload, @Ctx() context: IUserContext) {
    return this.groupService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupService.remove(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.markReady')
  markReady(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.groupService.markReady(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.cancel')
  cancel(@Payload(new RpcValidationPipe()) payload: CancelGroupPayload, @Ctx() context: IUserContext) {
    return this.groupService.cancel(actorFromContext(context), payload.id, payload.reason);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('academics.groups.setContentSent')
  setContentSent(@Payload(new RpcValidationPipe()) payload: ContentSentPayload, @Ctx() context: IUserContext) {
    return this.groupService.setContentSent(actorFromContext(context), payload.id, payload.done);
  }
}
