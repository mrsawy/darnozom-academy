import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'node:crypto';
import {
  IPaymentStrategy,
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  ProcessedWebhook,
  SubscriptionCheckoutResult,
} from '../interfaces/payment-strategy.interface';
import { Currency } from '@darnozom/shared-types';
import type { SubscribeToPlanPayload } from '../../dto/subscribe-to-plan.interface';
import { UserDocument } from 'src/user/entities/user.entity';
import { handleLemonSqueezySubscriptionWebhook } from './lemonSqueezySubscriptionWebhookHandler.service';
import type { LemonSqueezySubscriptionWebhookPayload } from '../../types/lemon-squeezy/lemon-squeezy-subscription-webhook.interface';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import type { LemonSqueezyCreateCheckoutPayload, LemonSqueezyCheckoutResponse } from '../../types/lemon-squeezy/lemon-squeezy-checkout.interface';
import { QueryService } from 'src/database/query';
import { Plan } from 'src/plan/entities/plan.entity';
import { AiPlan } from 'src/ai-plan/entities/ai-plan.entity';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { TransactionStatus } from 'src/transaction/entities/transaction.entity';
import type { ISubscribeToAiPlanPayload } from '../../dto/subscribe-to-ai-plan.interface';

const LEMON_SQUEEZY_API_BASE = 'https://api.lemonsqueezy.com';

@Injectable()
export class LemonSqueezyStrategy implements IPaymentStrategy {
  constructor(private readonly queryService: QueryService) {}

  getProvider(): PaymentProvider {
    return PaymentProvider.LEMON_SQUEEZY;
  }

  async createPaymentUrl(_request: PaymentRequest): Promise<PaymentResponse> {
    throw new BadRequestException('Lemon Squeezy one-time payment URL not implemented; use subscription checkout.');
  }

  async processWebhook(_payload: WebhookPayload): Promise<ProcessedWebhook> {
    return {
      success: false,
      transactionId: '',
      amount: 0,
      currency: Currency.USD,
      status: TransactionStatus.FAILED,
      metadata: {},
    };
  }

  /**
   * Verify webhook using HMAC-SHA256 of raw body.
   * @see https://docs.lemonsqueezy.com/help/webhooks/signing-requests
   */
  verifyWebhook(payload: unknown, signature?: string, rawBody?: string): boolean {
    if (!signature) return false;
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) return false;
    const bodyToSign = rawBody ?? (typeof payload === 'string' ? payload : JSON.stringify(payload));
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(bodyToSign).digest('hex'), 'utf8');
    const received = Buffer.from(signature, 'utf8');
    if (digest.length !== received.length) return false;
    return crypto.timingSafeEqual(digest, received);
  }

  async getPaymentStatus(_paymentId: string): Promise<ProcessedWebhook> {
    return {
      success: false,
      transactionId: _paymentId,
      amount: 0,
      currency: Currency.USD,
      status: TransactionStatus.FAILED,
      metadata: {},
    };
  }

  /**
   * Create a Lemon Squeezy checkout and return the checkout URL.
   * @see https://docs.lemonsqueezy.com/api/checkouts/create-checkout
   */
  async getSubscriptionPaymentUrl(dto: SubscribeToPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult> {
    if (dto.provider !== PaymentProvider.LEMON_SQUEEZY) {
      throw new BadRequestException('Lemon Squeezy strategy only supports LEMON_SQUEEZY provider');
    }

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      throw new BadRequestException('LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID must be set');
    }

    const plan = await this.queryService.findOneOrThrow<Plan>(Plan.name, { _id: dto.planId }, 'Plan not found');
    const variantIds = plan.lemonSqueezyVariantIds ?? {};
    const variantId = dto.lemonSqueezyVariantId ?? (dto.billingCycle === BillingCycle.YEARLY ? variantIds.YEARLY : variantIds.MONTHLY);

    if (!variantId) {
      throw new BadRequestException(
        `Plan has no Lemon Squeezy variant for ${dto.billingCycle}. Set lemonSqueezyVariantIds.MONTHLY or lemonSqueezyVariantIds.YEARLY on the plan, or pass lemonSqueezyVariantId.`
      );
    }

    const customData: Record<string, string> = {
      userId: user._id.toString(),
      planId: dto.planId,
      billingCycle: dto.billingCycle,
    };
    if (dto.organizationId) customData.organizationId = dto.organizationId;

    const redirectUrl = process.env.SECURED_BASE_URL
      ? `${process.env.SECURED_BASE_URL}/organization-dashboard/settings/plan?subscription=success`
      : undefined;
    const payload: LemonSqueezyCreateCheckoutPayload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: customData as Record<string, string | number>,
            email: user.email,
            ...([dto.customer.first_name, dto.customer.last_name].some(Boolean)
              ? { name: [dto.customer.first_name, dto.customer.last_name].filter(Boolean).join(' ') }
              : {}),
          },
          ...(redirectUrl ? { product_options: { redirect_url: redirectUrl } } : {}),
          test_mode: process.env.LEMON_SQUEEZY_TEST_MODE === 'true',
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    };

    const response = await axios.post<LemonSqueezyCheckoutResponse>(`${LEMON_SQUEEZY_API_BASE}/v1/checkouts`, payload, {
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const url = response.data?.data?.attributes?.url;
    if (!url) {
      throw new BadRequestException('Lemon Squeezy did not return a checkout URL');
    }

    return { url };
  }

  /**
   * Create a Lemon Squeezy checkout for an AI plan subscription.
   * Custom data includes `subscriptionType: 'AI_PLAN'`, `aiPlanId`, `userId`, `billingCycle`,
   * and optionally `childUserId` when a parent subscribes for a child.
   */
  async getAiSubscriptionPaymentUrl(dto: ISubscribeToAiPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult> {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      throw new BadRequestException('LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID must be set');
    }

    const aiPlan = await this.queryService.findOneOrThrow<AiPlan>(AiPlan.name, { _id: dto.aiPlanId }, 'AI plan not found');
    const variantIds = (aiPlan as AiPlan & { lemonSqueezyVariantIds?: { MONTHLY?: string; YEARLY?: string } }).lemonSqueezyVariantIds ?? {};
    const variantId = dto.lemonSqueezyVariantId ?? (dto.billingCycle === BillingCycle.YEARLY ? variantIds.YEARLY : variantIds.MONTHLY);

    if (!variantId) {
      throw new BadRequestException(
        `AI plan has no Lemon Squeezy variant for ${dto.billingCycle}. Set lemonSqueezyVariantIds on the AI plan, or pass lemonSqueezyVariantId.`
      );
    }

    const customData: Record<string, string> = {
      subscriptionType: 'AI_PLAN',
      userId: user._id.toString(),
      aiPlanId: dto.aiPlanId,
      billingCycle: dto.billingCycle,
    };
    if (dto.childUserId) customData.childUserId = dto.childUserId;

    const redirectUrl = process.env.SECURED_BASE_URL ? `${process.env.SECURED_BASE_URL}/ai-pricing?subscription=success` : undefined;

    const payload: LemonSqueezyCreateCheckoutPayload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: customData as Record<string, string | number>,
            email: user.email,
            ...([dto.customer.first_name, dto.customer.last_name].some(Boolean)
              ? { name: [dto.customer.first_name, dto.customer.last_name].filter(Boolean).join(' ') }
              : {}),
          },
          ...(redirectUrl ? { product_options: { redirect_url: redirectUrl } } : {}),
          test_mode: process.env.LEMON_SQUEEZY_TEST_MODE === 'true',
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    };

    const response = await axios.post<LemonSqueezyCheckoutResponse>(`${LEMON_SQUEEZY_API_BASE}/v1/checkouts`, payload, {
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const url = response.data?.data?.attributes?.url;
    if (!url) {
      throw new BadRequestException('Lemon Squeezy did not return a checkout URL');
    }

    return { url };
  }

  processSubscriptionWebhook(body: unknown): SubscriptionWebhookDto | null {
    const processed = handleLemonSqueezySubscriptionWebhook(body as LemonSqueezySubscriptionWebhookPayload);
    return mapLemonSqueezyProcessedToSubscriptionWebhookDto(processed);
  }
}

function mapLemonStatusToSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'on_trial': {
      return SubscriptionStatus.ACTIVE;
    }
    case 'cancelled': {
      return SubscriptionStatus.CANCELLED;
    }
    case 'expired': {
      return SubscriptionStatus.EXPIRED;
    }
    case 'paused':
    case 'past_due':
    case 'unpaid': {
      return SubscriptionStatus.SUSPENDED;
    }
    default: {
      return SubscriptionStatus.ACTIVE;
    }
  }
}

/**
 * Maps Lemon Squeezy processed webhook to the subscription-service DTO.
 * - For AI plan webhooks (subscriptionType === 'AI_PLAN'): returns a DTO with metadata so the
 *   webhook controller can route it to the AI subscription service.
 * - For org plan webhooks: returns a DTO when organizationId and planId are present.
 * - Returns null when neither case matches (e.g. checkout without custom_data).
 */
function mapLemonSqueezyProcessedToSubscriptionWebhookDto(processed: {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  billing?: { email?: string; firstName?: string; lastName?: string; phone?: string };
  subscription?: { nextBillingDate?: string; canceledAt?: string };
  metadata?: Record<string, unknown>;
}): SubscriptionWebhookDto | null {
  const meta = processed.metadata ?? {};
  const eventName = (meta.event_name as string) ?? '';
  const externalSubscriptionId = (meta.subscription_id as string) ?? processed.transactionId;
  const billingCycle = (meta.billingCycle as BillingCycle) ?? BillingCycle.MONTHLY;
  const nextBillingAt = processed.subscription?.nextBillingDate ? new Date(processed.subscription.nextBillingDate) : null;
  const endsAt = processed.subscription?.canceledAt ? new Date(processed.subscription.canceledAt) : null;

  const billing =
    processed.billing && processed.amount != null && processed.amount > 0
      ? {
          email: processed.billing.email ?? '',
          firstName: processed.billing.firstName ?? '',
          lastName: processed.billing.lastName ?? '',
          phoneNumber: processed.billing.phone,
          amount: processed.amount,
          currency: processed.currency,
          billingCycle,
        }
      : null;

  const baseDto = {
    eventName,
    success: processed.success,
    externalSubscriptionId,
    transactionId: processed.transactionId,
    status: mapLemonStatusToSubscriptionStatus(processed.status),
    billingCycle,
    nextBillingAt,
    endsAt,
    cancelledAt: endsAt ?? null,
    billing,
    metadata: processed.metadata,
  };

  // AI plan webhook: subscriptionType is 'AI_PLAN' in custom_data
  const subscriptionType = meta.subscriptionType as string | undefined;
  if (subscriptionType === 'AI_PLAN') {
    return { ...baseDto, organizationId: '', planId: '' };
  }

  // Org plan webhook: requires organizationId and planId
  const organizationId = meta.organizationId as string | undefined;
  const planId = meta.planId as string | undefined;
  if (!organizationId || !planId) return null;

  return { ...baseDto, organizationId, planId };
}
