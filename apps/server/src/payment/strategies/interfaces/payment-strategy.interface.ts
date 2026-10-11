import { Currency, PaymentMethod, PaymentProvider, PaymentPurpose } from '@lms-organization/shared-types';
import { UserDocument } from 'src/user/entities/user.entity';
import { Course } from 'src/course/entities/course.entity';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { TransactionStatus } from 'src/transaction/entities/transaction.entity';
import type { SubscribeToPlanPayload } from 'src/payment/dto/subscribe-to-plan.interface';
import type { ISubscribeToAiPlanPayload } from 'src/payment/dto/subscribe-to-ai-plan.interface';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';

export interface PaymentRequest {
  amount: number;
  currency: Currency;
  user: UserDocument;
  metadata?: Record<string, unknown>;
  billingData?: BillingData;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  course?: Course;
  billingCycle?: BillingCycle;
}

export interface BillingData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country: string;
    countryCode: string;
    postalCode?: string;
  };
}

export interface PaymentResponse {
  paymentUrl: string;
  paymentId: string;
  expiresAt?: Date;
  provider: PaymentProvider;
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
  provider: PaymentProvider;
  rawPayload: unknown;
  eventType: string;
}

export interface ProcessedWebhook {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
}

/**
 * Main Strategy Interface - All payment providers must implement this
 */
export interface IPaymentStrategy {
  /**
   * Get the provider identifier
   */
  getProvider(): PaymentProvider;

  /**
   * Create a payment URL/link for the user
   */
  createPaymentUrl(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Process webhook from payment provider
   */
  processWebhook(payload: WebhookPayload): Promise<ProcessedWebhook>;

  /**
   * Verify webhook authenticity (signature verification).
   * For Lemon Squeezy, pass rawBody when available (exact bytes) for correct HMAC verification.
   */
  verifyWebhook(payload: unknown, signature?: string, rawBody?: string): boolean;

  /**
   * Get payment status from provider
   */
  getPaymentStatus(paymentId: string): Promise<ProcessedWebhook>;

  /**
   * Get subscription checkout: either a redirect URL (Paymob, etc.) or Paddle overlay init (clientToken + priceId).
   */
  getSubscriptionPaymentUrl(dto: SubscribeToPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult>;

  /**
   * Process a subscription-specific webhook from the provider. Each provider must map
   * its payload to SubscriptionWebhookDto. Return null if the webhook is not supported
   * or not applicable (e.g. missing organizationId/planId).
   */
  processSubscriptionWebhook(body: unknown): SubscriptionWebhookDto | null;

  /**
   * Get AI subscription checkout URL for the given AI plan.
   * The subscriber is the authenticated user; when childUserId is set the subscription
   * will be assigned to the child on webhook receipt.
   * Throw BadRequestException if the provider does not support this.
   */
  getAiSubscriptionPaymentUrl(dto: ISubscribeToAiPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult>;
}

/**
 * Subscription-specific strategy for providers that support subscriptions
 */
export interface ISubscriptionStrategy extends IPaymentStrategy {
  createSubscriptionPlan(planData: SubscriptionPlanData): Promise<string>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  updateSubscription(subscriptionId: string, data: unknown): Promise<boolean>;
}

export interface SubscriptionPlanData {
  name: string;
  description: string;
  amount: number;
  currency: Currency;
  frequency: number; // in days
  trialDays?: number;
}

/** Customer prefill for Paddle overlay checkout (Paddle.Checkout.open). */
export interface PaddleCheckoutCustomer {
  email?: string;
  address?: { countryCode?: string; postalCode?: string; city?: string };
}

/** Result of subscribe-to-plan: redirect URL or Paddle overlay init per https://developer.paddle.com/build/checkout/build-overlay-checkout */
export type SubscriptionCheckoutResult =
  { url: string } | { clientToken: string; priceId: string; customer?: PaddleCheckoutCustomer; successUrl?: string };

export { PaymentProvider, PaymentPurpose } from '@lms-organization/shared-types';
