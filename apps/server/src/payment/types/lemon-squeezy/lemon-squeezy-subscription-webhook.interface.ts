/**
 * Lemon Squeezy webhook payloads (JSON:API style).
 * @see https://docs.lemonsqueezy.com/help/webhooks/webhook-requests
 * @see https://docs.lemonsqueezy.com/help/webhooks/event-types
 * @see https://docs.lemonsqueezy.com/api/subscriptions#the-subscription-object
 */

export type LemonSqueezyWebhookEventName =
  | 'order_created'
  | 'order_refunded'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_payment_recovered'
  | 'subscription_payment_refunded';

export interface LemonSqueezyWebhookMeta {
  test_mode?: boolean;
  event_name: LemonSqueezyWebhookEventName;
  custom_data?: Record<string, string | number>;
  webhook_id?: string;
}

export interface LemonSqueezySubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  status: 'active' | 'on_trial' | 'cancelled' | 'expired' | 'past_due' | 'unpaid' | 'paused';
  status_formatted: string;
  card_brand?: string;
  card_last_four?: string;
  payment_processor?: string;
  pause: { mode: string; resumes_at: string | null } | null;
  cancelled: boolean;
  trial_ends_at: string | null;
  billing_anchor: number;
  first_subscription_item: {
    id: number;
    subscription_id: number;
    price_id: number;
    quantity: number;
    is_usage_based: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  urls: {
    update_payment_method?: string;
    customer_portal?: string;
    customer_portal_update_subscription?: string;
  };
  renews_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
}

export interface LemonSqueezySubscriptionWebhookBody {
  meta: LemonSqueezyWebhookMeta & { event_name: LemonSqueezyWebhookEventName };
  data: {
    type: 'subscriptions';
    id: string;
    attributes: LemonSqueezySubscriptionAttributes;
    relationships?: Record<string, unknown>;
    links?: Record<string, unknown>;
  };
}

/** subscription_payment_* events send a subscription-invoice object (no order_id in attributes). */
export interface LemonSqueezySubscriptionInvoiceAttributes {
  store_id: number;
  subscription_id: number;
  customer_id: number;
  user_name: string;
  user_email: string;
  billing_reason: string;
  card_brand?: string;
  card_last_four?: string;
  currency: string;
  currency_rate: string;
  status: string;
  status_formatted: string;
  tax_inclusive: boolean;
  refunded: boolean;
  refunded_at: string | null;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  refunded_amount: number;
  subtotal_usd: number;
  discount_total_usd: number;
  tax_usd: number;
  total_usd: number;
  refunded_amount_usd: number;
  subtotal_formatted?: string;
  discount_total_formatted?: string;
  tax_formatted?: string;
  total_formatted?: string;
  refunded_amount_formatted?: string;
  urls?: {
    invoice_url?: string;
  };
  created_at: string;
  updated_at: string;
  test_mode: boolean;
}

export type LemonSqueezySubscriptionInvoiceEventName =
  'subscription_payment_success' | 'subscription_payment_failed' | 'subscription_payment_recovered' | 'subscription_payment_refunded';

export interface LemonSqueezySubscriptionInvoiceWebhookBody {
  meta: LemonSqueezyWebhookMeta & { event_name: LemonSqueezySubscriptionInvoiceEventName };
  data: {
    type: 'subscription-invoices';
    id: string;
    attributes: LemonSqueezySubscriptionInvoiceAttributes;
    relationships?: Record<string, unknown>;
    links?: Record<string, unknown>;
  };
}

export type LemonSqueezySubscriptionWebhookPayload = LemonSqueezySubscriptionWebhookBody | LemonSqueezySubscriptionInvoiceWebhookBody;
