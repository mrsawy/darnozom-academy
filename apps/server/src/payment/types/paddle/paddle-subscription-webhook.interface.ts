/**
 * Paddle subscription webhook payload (Paddle Billing / v2 API).
 * Paddle sends event notifications as POST requests to the webhook URL.
 * @see https://developer.paddle.com/webhooks/overview
 */
export interface PaddleSubscriptionWebhookBody {
  event_id: string;
  event_type: PaddleSubscriptionEventType;
  occurred_at: string;
  notification_id: string;
  data: PaddleSubscriptionWebhookData;
}

export type PaddleSubscriptionEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.activated'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.canceled'
  | 'subscription.past_due'
  | 'subscription.trialing'
  | 'transaction.completed'
  | 'transaction.payment_failed';

export interface PaddleSubscriptionWebhookData {
  id: string;
  status: PaddleSubscriptionStatus;
  customer_id: string;
  address_id?: string;
  business_id?: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  first_billed_at?: string;
  next_billed_at?: string;
  paused_at?: string;
  canceled_at?: string;
  collection_mode: 'automatic' | 'manual';
  billing_details?: PaddleBillingDetails;
  current_billing_period?: PaddleBillingPeriod;
  items: PaddleSubscriptionItem[];
  custom_data?: Record<string, unknown>;
  discount?: {
    id: string;
    starts_at?: string;
    ends_at?: string;
  };
  management_urls?: {
    update_payment_method?: string;
    cancel?: string;
  };
  transaction_id?: string;
}

export type PaddleSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing';

export interface PaddleBillingDetails {
  payment_terms?: {
    interval: string;
    frequency: number;
  };
  enable_checkout?: boolean;
  purchase_order_number?: string;
  additional_information?: string;
}

export interface PaddleBillingPeriod {
  starts_at: string;
  ends_at: string;
}

export interface PaddleSubscriptionItem {
  status: string;
  quantity: number;
  recurring: boolean;
  created_at: string;
  updated_at: string;
  price: PaddlePrice;
  product?: PaddleProduct;
}

export interface PaddlePrice {
  id: string;
  product_id: string;
  description: string;
  unit_price: {
    amount: string;
    currency_code: string;
  };
  billing_cycle?: {
    interval: 'day' | 'week' | 'month' | 'year';
    frequency: number;
  };
  trial_period?: {
    interval: 'day' | 'week' | 'month' | 'year';
    frequency: number;
  };
}

export interface PaddleProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  custom_data?: Record<string, unknown>;
}
