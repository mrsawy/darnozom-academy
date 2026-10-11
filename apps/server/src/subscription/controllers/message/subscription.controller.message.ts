import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { handleRpcError } from 'src/utils/errorHandling';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects, SubscriptionSuccessMessages, UserErrors } from '@darnozom/shared-types';
import { SubscriptionService } from '../../services/subscription.service';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../dto/update-subscription.dto';
import mongoose, { PaginateOptions } from 'mongoose';

@Controller('subscription')
export class SubscriptionControllerMessage {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('subscription.create')
  async create(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: CreateSubscriptionDto) {
    try {
      const organizationId = context.userPayload.organizationId?.toString() ?? payload.organizationId;
      const created = await this.subscriptionService.create({
        ...payload,
        organizationId,
      });
      return {
        message: SubscriptionSuccessMessages.SUBSCRIPTION_CREATED,
        subscription: created,
      };
    } catch (error: unknown) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('subscription.findByOrganization')
  async findByOrganization(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: {
      organizationId?: string;
      options: PaginateOptions;
      filters?: mongoose.RootFilterQuery<unknown>;
    }
  ) {
    try {
      const organizationId = payload.organizationId ?? context.userPayload.organizationId?.toString();
      if (!organizationId) throw new Error(UserErrors.ORGANIZATION_ID_REQUIRED);
      return this.subscriptionService.findByOrganization(organizationId, payload.options, payload.filters as Record<string, unknown> | undefined);
    } catch (error: unknown) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('subscription.findActiveByOrganization')
  async findActiveByOrganization(@Ctx() context: IUserContext) {
    try {
      const organizationId = context.userPayload.organizationId?.toString();
      if (!organizationId) return null;
      return this.subscriptionService.findActiveByOrganization(organizationId);
    } catch (error: unknown) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('subscription.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    try {
      return this.subscriptionService.findOne(payload.id);
    } catch (error: unknown) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('subscription.update')
  async update(
    @Payload(new RpcValidationPipe())
    payload: {
      id: string;
      dto: UpdateSubscriptionDto;
    }
  ) {
    try {
      const updated = await this.subscriptionService.update(payload.id, payload.dto);
      return {
        message: SubscriptionSuccessMessages.SUBSCRIPTION_UPDATED,
        subscription: updated,
      };
    } catch (error: unknown) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('subscription.cancel')
  async cancel(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    try {
      const updated = await this.subscriptionService.cancel(payload.id);
      return {
        message: SubscriptionSuccessMessages.SUBSCRIPTION_CANCELLED,
        subscription: updated,
      };
    } catch (error: unknown) {
      handleRpcError(error);
    }
  }
}
