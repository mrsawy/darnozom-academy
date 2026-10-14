import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { ShariaReviewService } from '../../services/content/sharia/sharia-review.service';
import { ShariaContentPayload, ShariaRejectPayload, ShariaVersionPayload } from '../../dto/sharia.dto';

@Controller()
@ApplyRpcErrorHandling
export class ShariaControllerMessage {
  constructor(private readonly review: ShariaReviewService) {}

  /** READ, not MANAGE: owners and managers may watch the queue without being able to act on it. */
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.queue')
  queue(@Ctx() context: IUserContext) {
    return this.review.queue(String(context.userPayload.organizationId));
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.versions')
  versions(@Payload(new RpcValidationPipe()) payload: ShariaContentPayload, @Ctx() context: IUserContext) {
    return this.review.versions(String(context.userPayload.organizationId), payload.contentId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.approve')
  approve(@Payload(new RpcValidationPipe()) payload: ShariaVersionPayload, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.review.approve(String(user._id), String(user.organizationId), payload.contentId, payload.version);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SHARIA_REVIEW })
  @MessagePattern('course.sharia.reject')
  reject(@Payload(new RpcValidationPipe()) payload: ShariaRejectPayload, @Ctx() context: IUserContext) {
    const user = context.userPayload;
    return this.review.reject(String(user._id), String(user.organizationId), payload.contentId, payload.version, payload.comment);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CONTENT })
  @MessagePattern('course.sharia.myVersions')
  myVersions(@Payload(new RpcValidationPipe()) payload: ShariaContentPayload, @Ctx() context: IUserContext) {
    return this.review.versions(String(context.userPayload.organizationId), payload.contentId);
  }
}
