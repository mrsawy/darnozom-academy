import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  IPaymentStrategy,
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  ProcessedWebhook,
  PaymentPurpose,
} from '../strategies/interfaces/payment-strategy.interface';
import { CreatePaymentUrlDto } from '../dto/create-payment-url.dto';
import { UserDocument } from 'src/user/entities/user.entity';
import { Course } from 'src/course/entities/course.entity';
import type { SubscribeToPlanPayload } from '../dto/subscribe-to-plan.interface';
import type { ISubscribeToAiPlanPayload } from '../dto/subscribe-to-ai-plan.interface';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';
import type { SubscriptionCheckoutResult } from '../strategies/interfaces/payment-strategy.interface';

@Injectable()
export class PaymentOrchestratorService {
  private strategies = new Map<PaymentProvider, IPaymentStrategy>();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  registerStrategy(strategy: IPaymentStrategy): void {
    this.strategies.set(strategy.getProvider(), strategy);
  }

  private getStrategy(provider: PaymentProvider): IPaymentStrategy {
    const strategy = this.strategies.get(provider);
    if (!strategy) {
      throw new BadRequestException(`Payment provider ${provider} is not supported`);
    }
    return strategy;
  }

  async createPaymentUrl({
    provider,
    amount,
    currency,
    user,
    purpose = PaymentPurpose.WALLET_CREDIT,
    method,
    course,
    billingCycle,
    metadata: dtoMetadata,
    courseId,
  }: CreatePaymentUrlDto & { user: UserDocument; course?: Course }): Promise<PaymentResponse> {
    const strategy = this.getStrategy(provider);

    const request: PaymentRequest = {
      amount,
      currency,
      purpose,
      user,
      method,
      course,
      billingCycle,
      metadata: {
        ...dtoMetadata,
        walletId: user.walletId?.toString(),
        courseId: course?._id.toString() ?? courseId,
      },
      billingData: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: {
          country: 'EG',
          countryCode: 'EG',
        },
      },
    };

    return await strategy.createPaymentUrl(request);
  }

  async processWalletCreditWebhook(
    provider: PaymentProvider,
    webhookPayload: unknown
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    const strategy = this.getStrategy(provider);

    if (!strategy.verifyWebhook(webhookPayload)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const processed = await strategy.processWebhook({
      provider,
      rawPayload: webhookPayload,
      eventType:
        (webhookPayload as { event_type?: string; type?: string }).event_type ??
        (webhookPayload as { event_type?: string; type?: string }).type ??
        '',
    });

    if (!processed.success) {
      return {
        success: false,
        message: 'Payment was not successful',
      };
    }

    // This will be handled by the webhook which has access to the container
    return {
      success: true,
      message: 'Webhook processed successfully',
      data: processed,
    };
  }

  async getPaymentStatus(provider: PaymentProvider, paymentId: string): Promise<ProcessedWebhook> {
    const strategy = this.getStrategy(provider);
    return await strategy.getPaymentStatus(paymentId);
  }

  getAvailableProviders(): PaymentProvider[] {
    return [...this.strategies.keys()];
  }

  async processWebhook(provider: PaymentProvider, payload: unknown) {
    const strategy = this.getStrategy(provider);
    const payloadObj = payload as { type?: string };
    return strategy.processWebhook({
      provider,
      rawPayload: payload,
      eventType: payloadObj.type ?? '',
    });
  }

  async getSubscriptionPaymentUrl(provider: PaymentProvider, dto: SubscribeToPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult> {
    const strategy = this.getStrategy(provider);
    return await strategy.getSubscriptionPaymentUrl(dto, user);
  }

  async getAiSubscriptionPaymentUrl(
    provider: PaymentProvider,
    dto: ISubscribeToAiPlanPayload,
    user: UserDocument
  ): Promise<SubscriptionCheckoutResult> {
    const strategy = this.getStrategy(provider);
    return await strategy.getAiSubscriptionPaymentUrl(dto, user);
  }

  processSubscriptionWebhook(provider: PaymentProvider, body: unknown): SubscriptionWebhookDto | null {
    const strategy = this.getStrategy(provider);
    return strategy.processSubscriptionWebhook(body);
  }

  /**
   * Verify subscription webhook signature (e.g. Lemon Squeezy X-Signature).
   * Pass rawBody when available for HMAC verification.
   */
  verifySubscriptionWebhook(provider: PaymentProvider, body: unknown, options?: { signature?: string; rawBody?: string }): boolean {
    const strategy = this.getStrategy(provider);
    return strategy.verifyWebhook(body, options?.signature, options?.rawBody);
  }
}
