/**
 * Stripe subscription webhook payload.
 * Stripe sends events via POST to the webhook endpoint.
 * @see https://docs.stripe.com/webhooks
 * @see https://docs.stripe.com/api/events
 */
export interface StripeSubscriptionWebhookBody {
  id: string;
  object: 'event';
  type: StripeSubscriptionEventType;
  api_version: string;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
  data: {
    object: StripeInvoice | StripeSubscription;
    previous_attributes?: Record<string, unknown>;
  };
}

export type StripeSubscriptionEventType =
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.paused'
  | 'customer.subscription.resumed'
  | 'customer.subscription.trial_will_end';

export interface StripeInvoice {
  id: string;
  object: 'invoice';
  subscription: string | null;
  customer: string;
  customer_email?: string | null;
  customer_name?: string | null;
  amount_paid: number;
  amount_due: number;
  amount_remaining: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  paid: boolean;
  billing_reason: 'subscription_create' | 'subscription_cycle' | 'subscription_update' | 'manual' | null;
  payment_intent?: string | null;
  charge?: string | null;
  period_start: number;
  period_end: number;
  lines?: {
    data: StripeInvoiceLineItem[];
  };
  metadata?: Record<string, string>;
}

export interface StripeInvoiceLineItem {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  price?: {
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
      interval_count: number;
    };
  };
  subscription?: string;
  period: {
    start: number;
    end: number;
  };
}

export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status: StripeSubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  ended_at: number | null;
  trial_start: number | null;
  trial_end: number | null;
  items: {
    data: StripeSubscriptionItem[];
  };
  latest_invoice?: string | null;
  default_payment_method?: string | null;
  currency: string;
  metadata?: Record<string, string>;
}

export type StripeSubscriptionStatus = 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';

export interface StripeSubscriptionItem {
  id: string;
  price: {
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
      interval_count: number;
    };
  };
  quantity: number;
}
