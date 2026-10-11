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
import { TransactionStatus } from 'src/transaction/entities/transaction.entity';
import type { SubscribeToPlanPayload } from '../../dto/subscribe-to-plan.interface';
import { UserDocument } from 'src/user/entities/user.entity';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';

@Injectable()
export class KashierStrategy implements IPaymentStrategy {
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = process.env.KASHIER_BASE_URL ?? '';
    this.merchantId = process.env.KASHIER_MERCHANT_ACCOUNT_ID ?? '';
    this.apiKey = process.env.KASHIER_PAYMENT_API_KEY ?? '';
    this.secretKey = process.env.KASHIER_SECRET_KEY ?? '';
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.KASHIER;
  }

  async createPaymentUrl(_request: PaymentRequest): Promise<PaymentResponse> {
    const orderId = this.generateOrderId();

    // Create your Order
    const order: Record<string, unknown> = {
      amount: 600,
      currency: 'EGP',
      merchantOrderId: Date.now(),
      mid: this.merchantId,
      secret: this.apiKey,
      baseUrl: process.env.SECURED_BASE_URL,
      // order meta data JSON String
      metaData: JSON.stringify({
        'Customer Name': 'Mohamed Khaled',
        'Cutomer Phone': '+20100XXX',
        'Cutomer Email': 'mkhalid@kashier.io',
      }),
      merchantRedirect: this.getRedirectUrl(),
      failureRedirect: this.getRedirectUrl(),
      serverWebhook: this.getWebhookUrl(),
      display: 'ar',
      redirectMethod: 'get',

      // Add the following options separated by comma remove or leave empty for all allowed methods.
      // ,allowedMethods:"card,wallet,bank_installments"
      //   allowedMethods: 'bank_installments,card',
      // Add the following your brand color by passing hexadecimal color as brandColor= encodeURIComponent("#A30000"),
      // Also you can set opacity by setting rgba as brandColor= encodeURIComponent("rgba(163, 0, 0, 1)")
      // By default the branding color is rgba(45, 164, 78, 0.9)
      brandColor: 'rgba(163, 0, 0, 1)',
      type: 'external',
    };

    (order as { hash?: string }).hash = this.generateKashierOrderHash(order);

    const hppUrl =
      `${this.baseUrl}?` +
      `merchantId=${order.mid as string}` +
      `&orderId=${order.merchantOrderId as string | number}` +
      `&amount=${order.amount as number}` +
      `&secret=${order.secret as string}` +
      `&currency=${order.currency as string}` +
      `&hash=${(order as { hash?: string }).hash ?? ''}` +
      `&merchantRedirect=${order.merchantRedirect as string}` +
      `&metaData=${(order.metaData as string | undefined) ?? ''}` +
      `&failureRedirect=${(order.failureRedirect as string | undefined) ?? ''}` +
      `&redirectMethod=${(order.redirectMethod as string | undefined) ?? ''}` +
      `&display=${(order.display as string | undefined) ?? ''}` +
      `&type=${(order.type as string | undefined) ?? ''}` +
      //   `&brandColor=${encodeURIComponent(order.brandColor)}` +
      `&mode=${process.env.KASHIER_MODE ?? 'test'}`;

    try {
      //   // ⭐ Axios GET (valid)
      await axios.get(hppUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      // Kashier always returns the same redirect URL you already built
      return {
        paymentUrl: hppUrl,
        paymentId: orderId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        provider: PaymentProvider.KASHIER,
        metadata: { orderId, merchantId: this.merchantId },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Kashier payment';
      throw new BadRequestException(`Failed to create Kashier payment: ${errorMessage}`);
    }
  }

  async processWebhook(payload: WebhookPayload): Promise<ProcessedWebhook> {
    const data = payload.rawPayload as Record<string, unknown>;

    // Verify webhook signature
    const dataSignature = data.signature as string | undefined;
    if (!this.verifyWebhook(data, dataSignature)) {
      return {
        success: false,
        transactionId: (data.order_id as string | undefined) ?? 'unknown',
        amount: 0,
        currency: ((data.currency as string | undefined) ?? 'EGP') as Currency,
        status: TransactionStatus.FAILED,
        metadata: {
          error: 'Invalid webhook signature',
        },
      };
    }

    const dataStatus = data.status as string | undefined;
    const dataResponse = data.response as { status?: string } | undefined;
    const isSuccessful = dataStatus === 'SUCCESS' || dataStatus === 'success' || dataResponse?.status === 'SUCCESS';

    if (!isSuccessful) {
      return {
        success: false,
        transactionId: (data.order_id as string | undefined) ?? (data.transaction_id as string | undefined) ?? 'unknown',
        amount: Number((data.amount as number | string | undefined) ?? 0) / 100,
        currency: ((data.currency as string | undefined) ?? 'EGP') as Currency,
        status: TransactionStatus.FAILED,
        metadata: {
          response: data.response,
          message: data.message,
        },
      };
    }

    const dataCustom = data.custom as string | undefined;
    const customData = dataCustom ? (JSON.parse(dataCustom) as Record<string, unknown>) : {};

    //   // ⭐ Axios GET (valid)
    await axios.get('invalid-url', {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    return {
      success: true,
      transactionId: (data.transaction_id as string | undefined) ?? (data.order_id as string | undefined) ?? 'unknown',
      amount: Number((data.amount as number | string | undefined) ?? 0) / 100,
      currency: ((data.currency as string | undefined) ?? 'EGP') as Currency,
      status: TransactionStatus.COMPLETED,
      metadata: {
        orderId: data.order_id as string | undefined,
        paymentMethod: data.payment_method as string | undefined,
        cardBrand: data.card_brand as string | undefined,
        cardLast4: data.card_last_four as string | undefined,
        transactionDate: data.transaction_date as string | undefined,
        ...customData,
      },
    };
  }

  verifyWebhook(payload: unknown, signature?: string, _rawBody?: string): boolean {
    if (!signature) {
      return false;
    }

    try {
      // Kashier webhook verification
      // Create hash from order_id, amount, currency, and secret key
      const payloadObj = payload as { order_id?: unknown; amount?: unknown; currency?: unknown };

      // Safely convert to string, ensuring we don't stringify objects
      const safeToString = (value: unknown): string => {
        if (value == null) return '';
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        return '';
      };

      const orderId = safeToString(payloadObj.order_id);
      const amount = safeToString(payloadObj.amount);
      const currency = safeToString(payloadObj.currency);
      const dataString = `${orderId}${amount}${currency}${this.secretKey}`;
      const calculatedHash = crypto.createHash('sha256').update(dataString).digest('hex');

      return calculatedHash === signature;
    } catch {
      return false;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<ProcessedWebhook> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/transactions/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const responseData = response.data as {
        response?: {
          status?: string;
          transaction_id?: string;
          amount?: number | string;
          currency?: string;
          order_id?: string;
          payment_method?: string;
          card_brand?: string;
          transaction_date?: string;
        };
      };
      const transaction = responseData.response;
      if (!transaction) {
        throw new BadRequestException('No transaction data in response');
      }
      const isSuccessful = transaction.status === 'SUCCESS';

      return {
        success: isSuccessful,
        transactionId: transaction.transaction_id ?? paymentId,
        amount: Number(transaction.amount ?? 0) / 100,
        currency: (transaction.currency ?? 'EGP') as Currency,
        status: isSuccessful ? TransactionStatus.COMPLETED : TransactionStatus.FAILED,
        metadata: {
          orderId: transaction.order_id,
          paymentMethod: transaction.payment_method,
          cardBrand: transaction.card_brand,
          transactionDate: transaction.transaction_date,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to fetch Kashier payment status: ${errorMessage}`);
    }
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).slice(7).toUpperCase()}`;
  }

  private getWebhookUrl(): string {
    return `${process.env.SECURED_BASE_URL}/payment/webhook/kashier`;
  }

  private getRedirectUrl(): string {
    return `${process.env.SECURED_BASE_URL}/payment/success`;
  }

  // Copy and paste this code into your backend

  private generateKashierOrderHash(order: Record<string, unknown>): string {
    const mid = 'MID-123-123'; // Your merchant ID
    const CustomerReference = '1'; // Your customer ID for saving the card
    const amount = order.amount as number; // e.g., 22.00
    const currency = order.currency as string; // e.g., "EGP"
    const orderId = order.merchantOrderId as string | number; // e.g., 99
    const secret = process.env.KASHIER_PAYMENT_API_KEY;
    const path = `/?payment=${mid}.${orderId}.${amount}.${currency}${CustomerReference ? '.' + CustomerReference : ''}`;

    const hash = crypto
      .createHmac('sha256', secret ?? '')
      .update(path)
      .digest('hex');
    return hash;
  }
  // The result hash for /?payment=mid-0-1.99.20.EGP with secret 11111
  // should be 606a8a1307d64caf4e2e9bb724738f115a8972c27eccb2a8acd9194c357e4bec

  processSubscriptionWebhook(_body: unknown): SubscriptionWebhookDto | null {
    return null;
  }

  getSubscriptionPaymentUrl(_dto: SubscribeToPlanPayload, _user: UserDocument): Promise<SubscriptionCheckoutResult> {
    throw new Error('Kashier subscribe-to-plan not implemented.');
  }

  async getAiSubscriptionPaymentUrl(_dto: unknown, _user: UserDocument): Promise<SubscriptionCheckoutResult> {
    throw new Error('Kashier AI subscription not implemented.');
  }
}
