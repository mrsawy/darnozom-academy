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
  PaddleCheckoutCustomer,
} from '../interfaces/payment-strategy.interface';
import { Currency } from '@lms-organization/shared-types';
import type { SubscribeToPlanPayload } from '../../dto/subscribe-to-plan.interface';
import { UserDocument } from 'src/user/entities/user.entity';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';
import { QueryService } from 'src/database/query';
import { Plan } from 'src/plan/entities/plan.entity';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { TransactionStatus } from 'src/transaction/entities/transaction.entity';

const PADDLE_API_BASE = 'https://api.paddle.com';

/** Paddle API client token response. @see https://developer.paddle.com/api-reference/client-tokens/create-client-token */
interface PaddleClientTokenResponse {
  data?: {
    token: string;
    id: string;
    name: string;
    status: string;
  };
}

@Injectable()
export class PaddleStrategy implements IPaymentStrategy {
  constructor(private readonly queryService: QueryService) {}

  getProvider(): PaymentProvider {
    return PaymentProvider.PADDLE;
  }

  async createPaymentUrl(_request: PaymentRequest): Promise<PaymentResponse> {
    throw new BadRequestException('Paddle one-time payment URL not implemented; use Paddle checkout overlay.');
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

  verifyWebhook(payload: unknown, signature?: string, _rawBody?: string): boolean {
    if (!signature || typeof payload !== 'object') return false;
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) return false;
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const [tsPart, h1Part] = signature.split(';').map((s) => s.split('=')[1]);
    if (!tsPart || !h1Part) return false;
    const payloadToSign = `${tsPart}:${raw}`;
    const expected = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h1Part, 'hex'), Buffer.from(expected, 'hex'));
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
   * Returns Paddle overlay checkout init: client token + price ID + optional customer prefill.
   * Frontend should load Paddle.js, call Paddle.Initialize({ token }), then Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customer, customData }).
   * @see https://developer.paddle.com/build/checkout/build-overlay-checkout
   * @see https://developer.paddle.com/paddlejs/methods/paddle-checkout-open
   */
  async getSubscriptionPaymentUrl(dto: SubscribeToPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult> {
    if (dto.provider !== PaymentProvider.PADDLE) {
      throw new BadRequestException('Paddle strategy only supports PADDLE provider');
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('PADDLE_API_KEY is not configured');
    }

    const plan = await this.queryService.findOneOrThrow<Plan>(Plan.name, { _id: dto.planId }, 'Plan not found');
    const paddlePriceIds = plan.paddlePriceIds ?? {};
    const priceId = dto.paddlePriceId ?? (dto.billingCycle === BillingCycle.YEARLY ? paddlePriceIds.YEARLY : paddlePriceIds.MONTHLY);

    if (!priceId?.startsWith('pri_')) {
      throw new BadRequestException(
        `Plan has no Paddle price ID for ${dto.billingCycle}. Configure paddlePriceIds.MONTHLY or paddlePriceIds.YEARLY on the plan, or pass paddlePriceId.`
      );
    }

    const clientToken = await this.createClientToken(apiKey);
    // const organizationId = dto.organizationId ?? user.organizationId?.toString();
    const customer: PaddleCheckoutCustomer = {
      email: user.email,
      address: {
        countryCode: dto.billing_data?.country_code ?? user.profile?.address?.country?.slice(0, 2) ?? undefined,
        postalCode: user.profile?.address?.zipCode,
        city: user.profile?.address?.city,
      },
    };

    const successUrl = process.env.SECURED_BASE_URL
      ? `${process.env.SECURED_BASE_URL}/organization-dashboard/settings/plan?subscription=success`
      : undefined;

    return {
      clientToken,
      priceId,
      customer,
      successUrl,
    };
  }

  processSubscriptionWebhook(_body: unknown): SubscriptionWebhookDto | null {
    return null;
  }

  async getAiSubscriptionPaymentUrl(_dto: unknown, _user: UserDocument): Promise<SubscriptionCheckoutResult> {
    throw new Error('Paddle AI subscription not implemented.');
  }

  private async createClientToken(apiKey: string): Promise<string> {
    const base = process.env.PADDLE_API_BASE ?? PADDLE_API_BASE;
    const response = await axios.post<PaddleClientTokenResponse>(
      `${base}/client-tokens`,
      {
        name: 'Organization plan checkout',
        description: 'Client token for overlay checkout on plan settings page',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const token = response.data?.data?.token;
    if (!token) {
      throw new BadRequestException('Paddle did not return a client token');
    }
    return token;
  }
}
