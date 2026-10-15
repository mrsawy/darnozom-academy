import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from 'src/academics/common/actor';
import { MessageTemplateService } from './services/message-template.service';
import { TemplateRenderService } from './services/template-render.service';
import {
  CreateMessageTemplateDtoServer,
  MessageTemplateIdPayload,
  RenderMessageTemplatePayload,
  UpdateMessageTemplatePayload,
} from './dto/message-template.dto';

@Controller()
@ApplyRpcErrorHandling
export class MessageTemplateControllerMessage {
  constructor(
    private readonly templateService: MessageTemplateService,
    private readonly renderService: TemplateRenderService,
  ) {}

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateMessageTemplateDtoServer, @Ctx() ctx: IUserContext) {
    const actor = actorFromContext(ctx);
    return this.templateService.create(actor.organizationId, actor._id, payload);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.list')
  list(@Ctx() ctx: IUserContext) {
    return this.templateService.findAll(actorFromContext(ctx).organizationId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateMessageTemplatePayload, @Ctx() ctx: IUserContext) {
    return this.templateService.update(actorFromContext(ctx).organizationId, payload.id, payload.dto);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.remove')
  remove(@Payload(new RpcValidationPipe()) payload: MessageTemplateIdPayload, @Ctx() ctx: IUserContext) {
    return this.templateService.remove(actorFromContext(ctx).organizationId, payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.render')
  render(@Payload(new RpcValidationPipe()) payload: RenderMessageTemplatePayload, @Ctx() ctx: IUserContext) {
    return this.renderService.render(actorFromContext(ctx), payload.id, {
      groupId: payload.groupId,
      studentId: payload.studentId,
    });
  }
}
