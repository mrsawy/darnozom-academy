import { Controller, Post, Body, UseGuards, Req, Param, BadRequestException, Headers, Logger } from '@nestjs/common';
import { PaymentOrchestratorService } from '../services/payment-orchestrator.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { CreatePaymentUrlDto } from '../dto/create-payment-url.dto';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { SubscriptionDocument } from 'src/subscription/entities/subscription.entity';
import { AiSubscriptionService } from 'src/ai-subscription/services/ai-subscription.service';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { RateLimiterGuard } from 'src/rate-limiter/rate-limiter.guard';
import { RateLimit } from 'src/rate-limiter/rate-limiter.decorator';

@Controller('payment')
export class PaymentHttpController {
  private readonly logger = new Logger(PaymentHttpController.name);

  constructor(
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly subscriptionService: SubscriptionService,
    private readonly aiSubscriptionService: AiSubscriptionService
  ) {}

  @UseGuards(AuthGuard)
  @Post('/create-payment-url')
  async createPaymentUrl(@Body() body: CreatePaymentUrlDto, @Req() req: IUserRequest) {
    return this.paymentOrchestrator.createPaymentUrl({ ...body, user: req.user });
  }

  /**
   * POST /payment/subscription/webhook/:provider
   * Generic subscription webhook endpoint – handles all providers.
   * Routes AI plan webhooks (metadata.subscriptionType === 'AI_PLAN' or metadata.aiPlanId present)
   * to the AI subscription service; all others go to the org subscription service.
   */
  @UseGuards(RateLimiterGuard)
  @RateLimit({ maxRequests: 200, ttlSeconds: 60 })
  @Post('/subscription/webhook/:provider')
  async handleSubscriptionWebhook(
    @Param('provider') providerParam: string,
    @Body() body: unknown,
    @Headers('x-signature') signature?: string,
    @Headers('x-webhook-signature') webhookSignature?: string
  ) {
    const provider = this.resolveProvider(providerParam);

    const effectiveSignature = signature ?? webhookSignature;
    const isValid = this.paymentOrchestrator.verifySubscriptionWebhook(provider, body, { signature: effectiveSignature });
    if (!isValid) {
      this.logger.warn(`Webhook signature verification failed for provider=${providerParam}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    let dto: ReturnType<typeof this.paymentOrchestrator.processSubscriptionWebhook>;
    try {
      dto = this.paymentOrchestrator.processSubscriptionWebhook(provider, body);
    } catch (error) {
      this.logger.error(`Failed to parse subscription webhook for provider=${providerParam}`, error);
      throw new BadRequestException('Malformed webhook payload');
    }

    if (!dto) {
      this.logger.warn(`Unsupported or inapplicable webhook skipped for provider=${providerParam}`);
      return { received: true, skipped: true };
    }

    const meta = dto.metadata ?? {};
    const isAiPlan = meta.subscriptionType === 'AI_PLAN' || Boolean(meta.aiPlanId);

    if (isAiPlan) {
      const aiPlanId = meta.aiPlanId as string | undefined;
      const userId = meta.userId as string | undefined;
      const childUserId = meta.childUserId as string | undefined;
      const billingCycle = (meta.billingCycle as BillingCycle | undefined) ?? BillingCycle.MONTHLY;

      if (!aiPlanId || !userId) {
        this.logger.warn(`AI plan webhook missing required metadata: aiPlanId=${aiPlanId}, userId=${userId}`);
        return { received: true, skipped: true, reason: 'missing aiPlanId or userId in AI plan webhook' };
      }

      try {
        const subscription = await this.aiSubscriptionService.handleAiSubscriptionWebhook({
          success: dto.success,
          status: dto.status as unknown as SubscriptionStatus,
          userId,
          aiPlanId,
          billingCycle,
          transactionId: dto.transactionId,
          nextBillingAt: dto.nextBillingAt,
          endsAt: dto.endsAt,
          childUserId,
          billing: dto.billing
            ? {
                email: dto.billing.email ?? '',
                firstName: dto.billing.firstName ?? '',
                lastName: dto.billing.lastName ?? '',
                phoneNumber: dto.billing.phoneNumber,
                amount: dto.billing.amount,
                currency: dto.billing.currency,
              }
            : null,
        });

        return {
          received: true,
          success: dto.success,
          eventName: dto.eventName,
          ...(subscription && { subscription }),
        };
      } catch (error) {
        this.logger.error(`Failed to handle AI subscription webhook: transactionId=${dto.transactionId}`, error);
        throw error;
      }
    }

    try {
      const subscription = await this.subscriptionService.handleProcessedSubscriptionWebhook(dto);
      return {
        received: true,
        success: dto.success,
        eventName: dto.eventName,
        ...(subscription && { subscription: (subscription.toObject?.() as SubscriptionDocument) ?? subscription }),
      };
    } catch (error) {
      this.logger.error(`Failed to handle org subscription webhook: transactionId=${dto.transactionId}`, error);
      throw error;
    }
  }

  /**
   * POST /payment/ai-subscription/webhook/:provider
   * Dedicated AI subscription webhook endpoint (kept for providers that support per-checkout notification URLs).
   * For Lemon Squeezy (single global webhook URL), use /subscription/webhook/:provider instead.
   */
  @UseGuards(RateLimiterGuard)
  @RateLimit({ maxRequests: 200, ttlSeconds: 60 })
  @Post('/ai-subscription/webhook/:provider')
  async handleAiSubscriptionWebhook(
    @Param('provider') providerParam: string,
    @Body() body: unknown,
    @Headers('x-signature') signature?: string,
    @Headers('x-webhook-signature') webhookSignature?: string
  ) {
    return this.handleSubscriptionWebhook(providerParam, body, signature, webhookSignature);
  }

  private resolveProvider(param: string): PaymentProvider {
    const normalized = param.toUpperCase().replaceAll('-', '_');
    const provider = PaymentProvider[normalized as keyof typeof PaymentProvider];
    if (!provider) throw new BadRequestException(`Unknown payment provider: ${param}`);
    return provider;
  }
}
