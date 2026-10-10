import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { AiSubscriptionService } from '../../services/ai-subscription.service';
import type { PaginateOptions } from 'mongoose';

@Controller()
@ApplyRpcErrorHandling
export class AiSubscriptionControllerMessage {
  constructor(private readonly aiSubscriptionService: AiSubscriptionService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('ai-subscription.findAll')
  async findAll(
    @Payload(new RpcValidationPipe())
    payload: {
      options: PaginateOptions;
      filters?: {
        aiPlanId?: string;
        createdAtFrom?: string;
        createdAtTo?: string;
      };
    }
  ) {
    return this.aiSubscriptionService.findAll(payload.options, payload.filters);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('ai-subscription.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.aiSubscriptionService.findOne(payload.id);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('ai-subscription.findActiveByUser')
  async findActiveByUser(@Ctx() context: IUserContext) {
    return this.aiSubscriptionService.findActiveByUser(context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('ai-subscription.cancel')
  async cancel(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.aiSubscriptionService.cancel(payload.id);
  }
}
