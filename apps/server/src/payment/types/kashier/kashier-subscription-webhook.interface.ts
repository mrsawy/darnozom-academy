/**
 * Kashier subscription webhook payload.
 * Kashier sends this to the webhook URL on subscription payment events.
 * @see https://kashier.readme.io/docs/webhooks
 */
export interface KashierSubscriptionWebhookBody {
  event: KashierSubscriptionEvent;
  data: KashierSubscriptionWebhookData;
  signature: string;
  timestamp: string;
}

export type KashierSubscriptionEvent =
  'subscription.created' | 'subscription.renewed' | 'subscription.cancelled' | 'subscription.payment_failed' | 'subscription.expired';

export interface KashierSubscriptionWebhookData {
  subscriptionId: string;
  orderId: string;
  merchantOrderId?: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: KashierSubscriptionStatus;
  paymentMethod?: string;
  cardBrand?: string;
  cardLastFour?: string;
  cardToken?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  plan?: {
    planId: string;
    name?: string;
    interval?: string;
    intervalCount?: number;
  };
  nextBillingDate?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type KashierSubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PENDING';
