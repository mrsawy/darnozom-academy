import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

/**
 * Provider-agnostic DTO for subscription webhooks. Each payment provider (Lemon Squeezy,
 * Paddle, Paymob, etc.) must map its webhook payload to this shape in processSubscriptionWebhook.
 * The subscription service uses this to create, update, or cancel subscriptions.
 */
export interface SubscriptionWebhookDto {
  eventName: string;
  success: boolean;
  organizationId: string;
  planId: string;
  /** Provider's subscription id; stored as transactionId and used to find our record. */
  externalSubscriptionId: string;
  /** Invoice/order id when relevant (e.g. subscription_payment_success). */
  transactionId?: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  nextBillingAt?: Date | null;
  endsAt?: Date | null;
  cancelledAt?: Date | null;
  billing?: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
  } | null;
  metadata?: Record<string, unknown>;
}
