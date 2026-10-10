import { CanActivate, ExecutionContext, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { AiSubscriptionErrors, UserErrors } from '@lms-organization/shared-types';
import { AiSubscriptionService } from '../services/ai-subscription.service';
import { AI_SUBSCRIPTION_LIMIT_KEY } from '../decorators/check-ai-subscription-limit.decorator';
import { AI_FEATURE_LIMIT_CONFIG, AiFeatureLimitDefinition } from '../constants/ai-feature-limit.config';
import { UserDocument } from 'src/user/entities/user.entity';
import { AiPlan } from 'src/ai-plan/entities/ai-plan.entity';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { AiSubscriptionDocument } from '../entities/ai-subscription.entity';

interface RpcContextWithUser {
  userPayload?: UserDocument;
}

@Injectable()
export class AiSubscriptionLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly aiSubscriptionService: AiSubscriptionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>(AI_SUBSCRIPTION_LIMIT_KEY, context.getHandler());
    if (!feature) return true;

    const config = AI_FEATURE_LIMIT_CONFIG[feature];
    if (!config) {
      throw new InternalServerErrorException(`${AiSubscriptionErrors.UNKNOWN_AI_SUBSCRIPTION_FEATURE}|${feature}`);
    }

    const isHttp = context.getType() === 'http';
    const isRpc = context.getType() === 'rpc';

    if (!isHttp && !isRpc) {
      throw new InternalServerErrorException(AiSubscriptionErrors.UNIMPLEMENTED_COMMUNICATION_CONTEXT);
    }

    const userId = isHttp ? this.getUserIdFromHttp(context) : this.getUserIdFromRpc(context);

    const subscription = await (config.type === 'numeric'
      ? this.aiSubscriptionService.resetDailyUsageIfNeeded(userId)
      : this.aiSubscriptionService.findActiveByUser(userId));

    if (!subscription) {
      this.throwError(isHttp, AiSubscriptionErrors.NO_ACTIVE_AI_SUBSCRIPTION);
    }

    if (subscription.endsAt && subscription.endsAt < new Date()) {
      await this.aiSubscriptionService.update(subscription._id.toString(), {
        status: SubscriptionStatus.EXPIRED,
      } as Partial<AiSubscriptionDocument>);
      this.throwError(isHttp, AiSubscriptionErrors.AI_SUBSCRIPTION_EXPIRED);
    }

    const plan = (subscription as unknown as { aiPlanId: AiPlan }).aiPlanId;
    if (!plan) {
      this.throwError(isHttp, AiSubscriptionErrors.AI_SUBSCRIPTION_PLAN_NOT_RESOLVED);
    }

    this.enforceLimit(isHttp, feature, config, plan, subscription.usage);

    return true;
  }

  private enforceLimit(
    isHttp: boolean,
    feature: string,
    config: AiFeatureLimitDefinition,
    plan: AiPlan,
    usage: { dailyMessagesUsed: number; lastDailyReset: Date }
  ): void {
    const featureValue = (plan.features as Record<string, unknown>)[feature];

    if (config.type === 'boolean') {
      if (featureValue !== true) {
        this.throwError(isHttp, `${AiSubscriptionErrors.AI_PLAN_FEATURE_NOT_INCLUDED}|${feature}`);
      }
      return;
    }

    const limit = featureValue as number;
    if (limit < 0) return; // -1 = unlimited

    const usageField = config.usageField!;
    const current = ((usage as Record<string, unknown>)[usageField] as number) ?? 0;

    if (current >= limit) {
      this.throwError(isHttp, `${AiSubscriptionErrors.DAILY_AI_MESSAGE_LIMIT_REACHED}|${current}|${limit}`);
    }
  }

  private getUserIdFromHttp(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<{ user?: UserDocument }>();
    const userId = request.user?._id?.toString();
    if (!userId) throw new ForbiddenException(UserErrors.USER_NOT_FOUND);
    return userId;
  }

  private getUserIdFromRpc(context: ExecutionContext): string {
    const rpcContext = context.switchToRpc().getContext<RpcContextWithUser>();
    const userId = rpcContext.userPayload?._id?.toString();
    if (!userId) throw new RpcException(UserErrors.USER_NOT_FOUND);
    return userId;
  }

  private throwError(isHttp: boolean, message: string): never {
    if (isHttp) throw new ForbiddenException(message);
    throw new RpcException(message);
  }
}
