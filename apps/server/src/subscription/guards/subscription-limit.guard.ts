import { CanActivate, ExecutionContext, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { SubscriptionLimitErrors, UserErrors } from '@darnozom/shared-types';
import { SubscriptionService } from '../services/subscription.service';
import { SUBSCRIPTION_LIMIT_KEY } from '../decorators/check-subscription-limit.decorator';
import { FEATURE_LIMIT_CONFIG, FeatureLimitDefinition } from '../constants/feature-limit.config';
import { UserDocument } from 'src/user/entities/user.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

interface RpcContextWithUser {
  userPayload?: UserDocument;
}

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>(SUBSCRIPTION_LIMIT_KEY, context.getHandler());
    if (!feature) return true;

    const config = FEATURE_LIMIT_CONFIG[feature];
    if (!config) {
      throw new InternalServerErrorException(`${SubscriptionLimitErrors.UNKNOWN_SUBSCRIPTION_FEATURE}|${feature}`);
    }

    const isHttp = context.getType() === 'http';
    const isRpc = context.getType() === 'rpc';

    if (!isHttp && !isRpc) {
      throw new InternalServerErrorException(SubscriptionLimitErrors.UNIMPLEMENTED_COMMUNICATION_CONTEXT);
    }

    const organizationId = isHttp ? this.getOrgIdFromHttp(context) : this.getOrgIdFromRpc(context);

    const subscription = await this.subscriptionService.findActiveByOrganization(organizationId);
    if (!subscription) {
      this.throwError(isHttp, SubscriptionLimitErrors.NO_ACTIVE_ORGANIZATION_SUBSCRIPTION);
    }

    // If the subscription's period has passed but status was never updated, expire it now.
    if (subscription.endsAt && subscription.endsAt < new Date()) {
      await this.subscriptionService.update(subscription._id.toString(), {
        status: SubscriptionStatus.EXPIRED,
      });
      this.throwError(isHttp, SubscriptionLimitErrors.ORGANIZATION_SUBSCRIPTION_EXPIRED);
    }

    const plan = (subscription as unknown as { plan: Plan }).plan;
    if (!plan) {
      this.throwError(isHttp, SubscriptionLimitErrors.ORGANIZATION_SUBSCRIPTION_PLAN_NOT_RESOLVED);
    }

    this.enforceLimit(isHttp, feature, config, plan, subscription.usage);

    return true;
  }

  private enforceLimit(
    isHttp: boolean,
    feature: string,
    config: FeatureLimitDefinition,
    plan: Plan,
    usage: {
      usersUsed: number;
      coursesUsed: number;
      pagesUsed: number;
      parentUsersUsed: number;
      storageUsedGB: number;
      liveSessionsUsed: number;
      assignmentsUsed: number;
    }
  ): void {
    const featureValue = (plan.features as Record<string, unknown>)[feature];

    if (config.type === 'boolean') {
      if (featureValue !== true) {
        this.throwError(isHttp, `${SubscriptionLimitErrors.PLAN_FEATURE_NOT_INCLUDED}|${feature}`);
      }
      return;
    }

    const usageField = config.usageField!;
    const limit = featureValue as number;
    if (limit < 0) return;
    const current = (usage as Record<string, number>)[usageField] ?? 0;

    if (current >= limit) {
      this.throwError(isHttp, `${SubscriptionLimitErrors.SUBSCRIPTION_PLAN_LIMIT_REACHED}|${current}|${limit}`);
    }
  }

  private getOrgIdFromHttp(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<{ user?: UserDocument }>();
    const orgId = request.user?.organizationId?.toString();
    if (!orgId) {
      throw new ForbiddenException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return orgId;
  }

  private getOrgIdFromRpc(context: ExecutionContext): string {
    const rpcContext = context.switchToRpc().getContext<RpcContextWithUser>();
    const orgId = rpcContext.userPayload?.organizationId?.toString();
    if (!orgId) {
      throw new RpcException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return orgId;
  }

  private throwError(isHttp: boolean, message: string): never {
    if (isHttp) throw new ForbiddenException(message);
    throw new RpcException(message);
  }
}
