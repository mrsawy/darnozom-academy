// src/payment/strategies/paypal.strategy.ts

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
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
import { TransactionStatus } from 'src/transaction/entities/transaction.entity';
import { PayPalWebhookLink } from '../../types/paypal/paybalWebhookBody.interface';
import { PayPalOrderResponse, PayPalCaptureResource, PayPalOrderDetails, PayPalTokenResponse } from '../../types/paypal/PayPalOrder.interface';
import type { SubscribeToPlanPayload } from '../../dto/subscribe-to-plan.interface';
import { UserDocument } from 'src/user/entities/user.entity';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';

@Injectable()
export class PaypalStrategy implements IPaymentStrategy {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly secret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  getProvider(): PaymentProvider {
    return PaymentProvider.PAYPAL;
  }

  async createPaymentUrl(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAuthToken();

      // For wallet credit, create a simple order (not subscription)
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: request.currency || Currency.USD,
              value: request.amount.toFixed(2),
            },
            description: `Wallet Credit - ${request.amount} ${request.currency}`,
            custom_id: JSON.stringify({
              userId: request.user._id.toString(),
              purpose: request.purpose,
              ...request.metadata,
            }),
          },
        ],
        application_context: {
          return_url: this.getReturnUrl(),
          cancel_url: this.getCancelUrl(),
          brand_name: 'Your App Name',
          user_action: 'PAY_NOW',
        },
      };

      const response = await axios.post<PayPalOrderResponse>(`${this.baseUrl}/v2/checkout/orders`, orderData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const approvalLink = response.data.links.find((link: PayPalWebhookLink) => link.rel === 'approve');
      const approvalUrl = approvalLink?.href;

      if (!approvalUrl) {
        throw new InternalServerErrorException('No approval URL found in PayPal response');
      }

      return {
        paymentUrl: approvalUrl,
        paymentId: response.data.id,
        provider: PaymentProvider.PAYPAL,
        metadata: {
          orderId: response.data.id,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof AxiosError ? error.message : error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`PayPal payment creation failed: ${errorMessage}`);
    }
  }

  processWebhook(payload: WebhookPayload): Promise<ProcessedWebhook> {
    const rawPayload = payload.rawPayload as { event_type: string; resource: PayPalCaptureResource };
    const { event_type, resource } = rawPayload;

    // Handle different PayPal webhook event types
    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const customData = resource.custom_id ? (JSON.parse(resource.custom_id) as Record<string, unknown>) : {};

      return Promise.resolve({
        success: true,
        transactionId: resource.id,
        amount: Number.parseFloat(resource.amount.value),
        currency: resource.amount.currency_code as Currency,
        status: TransactionStatus.COMPLETED,
        metadata: {
          ...customData,
          payerId: resource.payer?.payer_id,
          email: resource.payer?.email_address,
        },
      });
    }

    if (event_type === 'PAYMENT.CAPTURE.DENIED') {
      return Promise.resolve({
        success: false,
        transactionId: resource.id ?? 'unknown',
        amount: 0,
        currency: Currency.USD,
        status: TransactionStatus.FAILED,
        metadata: {},
      });
    }

    // Handle other event types...
    return Promise.resolve({
      success: false,
      transactionId: 'unknown',
      amount: 0,
      currency: Currency.USD,
      status: TransactionStatus.PENDING,
      metadata: { event_type },
    });
  }

  verifyWebhook(payload: unknown, signature?: string, _rawBody?: string): boolean {
    // Implement PayPal webhook signature verification
    // https://developer.paypal.com/api/rest/webhooks/
    // This requires webhook ID and transmission signature verification
    // Parameters are required by interface but not used in this implementation
    void payload;
    void signature;
    return true;
  }

  async getPaymentStatus(paymentId: string): Promise<ProcessedWebhook> {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get<PayPalOrderDetails>(`${this.baseUrl}/v2/checkout/orders/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const order = response.data;
      const status = order.status === 'COMPLETED' ? TransactionStatus.COMPLETED : TransactionStatus.PENDING;
      const firstPurchaseUnit = order.purchase_units[0];

      if (!firstPurchaseUnit) {
        throw new BadRequestException('No purchase units found in PayPal order');
      }

      return {
        success: order.status === 'COMPLETED',
        transactionId: order.id,
        amount: Number.parseFloat(firstPurchaseUnit.amount.value),
        currency: firstPurchaseUnit.amount.currency_code as Currency,
        status,
        metadata: {
          payerEmail: order.payer?.email_address,
          payerId: order.payer?.payer_id,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof AxiosError ? error.message : error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to fetch PayPal order status: ${errorMessage}`);
    }
  }

  private async getAuthToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    const response = await axios.post<PayPalTokenResponse>(`${this.baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
      auth: {
        username: this.clientId,
        password: this.secret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const expiresIn = response.data.expires_in ?? 3600;
    this.cachedToken = {
      token: response.data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return this.cachedToken.token;
  }

  private getReturnUrl(): string {
    const baseUrl = process.env.APP_BASE_URL;
    return `${baseUrl}/payment/paypal/return`;
  }

  private getCancelUrl(): string {
    const baseUrl = process.env.APP_BASE_URL;
    return `${baseUrl}/payment/paypal/cancel`;
  }

  processSubscriptionWebhook(_body: unknown): SubscriptionWebhookDto | null {
    return null;
  }

  getSubscriptionPaymentUrl(_dto: SubscribeToPlanPayload, _user: UserDocument): Promise<SubscriptionCheckoutResult> {
    throw new Error('PayPal subscribe-to-plan not implemented.');
  }

  async getAiSubscriptionPaymentUrl(_dto: unknown, _user: UserDocument): Promise<SubscriptionCheckoutResult> {
    throw new Error('PayPal AI subscription not implemented.');
  }
}
