/**
 * Paymob subscription webhook payload.
 * Paymob POSTs this to the subscription webhook URL on payment events (e.g. success, renewal).
 * Shape: type + obj (transaction), same as transaction webhook.
 */
export interface PaymobSubscriptionWebhookBody {
  type: string;
  obj?: PaymobSubscriptionWebhookObj;
  accept_fees?: number;
  issuer_bank?: string | null;
  transaction_processed_callback_responses?: string;
}

export interface PaymobSubscriptionWebhookObj {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
  is_auth?: boolean;
  is_capture?: boolean;
  is_standalone_payment?: boolean;
  is_voided?: boolean;
  is_refunded?: boolean;
  is_3d_secure?: boolean;
  integration_id?: number;
  profile_id?: number;
  has_parent_transaction?: boolean;
  transaction_processed_callback_responses?: unknown[];
  source_data?: {
    type?: string;
    pan?: string;
    sub_type?: string;
    tenure?: string | null;
  };
  api_source?: string;
  terminal_id?: string | null;
  merchant_commission?: number;
  accept_fees?: number;
  installment?: unknown;
  discount_details?: unknown[];
  amount_cents_bigint?: number;
  is_void?: boolean;
  is_refund?: boolean;
  is_hidden?: boolean;
  error_occured?: boolean;
  is_live?: boolean;
  other_endpoint_reference?: string | null;
  refunded_amount_cents?: number;
  source_id?: number;
  is_captured?: boolean;
  captured_amount?: number;
  merchant_staff_tag?: string | null;
  is_settled?: boolean;
  bill_balanced?: boolean;
  is_bill?: boolean;
  owner?: number;
  parent_transaction?: unknown;

  /** Top-level billing_data may be present on obj in some payloads */
  billing_data?: PaymobSubscriptionBillingData;

  /** Contains user_id, billing_data, next_payment_intention (recurring), etc. */
  payment_key_claims?: PaymobSubscriptionPaymentKeyClaims;

  order?: PaymobSubscriptionWebhookOrder;

  /** Gateway/transaction details (MIGS, etc.) */
  data?: Record<string, unknown>;

  [key: string]: unknown;
}

export interface PaymobSubscriptionPaymentKeyClaims {
  user_id?: number;
  amount_cents: number;
  currency: string;
  integration_id?: number;
  order_id?: number;
  billing_data?: PaymobSubscriptionBillingData;
  lock_order_when_paid?: boolean;
  extra?: PaymobSubscriptionExtras;
  notification_url?: string;
  redirection_url?: string;
  single_payment_attempt?: boolean;
  created_by?: number;
  is_partner?: boolean;
  /** Next payment intention id for recurring subscription */
  next_payment_intention?: string;
  redirect_url?: string;
  subscription_plan_id?: string;
  /** Frequency of the subscription plan (in days) */
  frequency?: number;
  /** Whether this transaction is a trial payment */
  is_trial?: boolean;
  /** Whether this is a renewal transaction (not the first payment) */
  is_renewal?: boolean;
  /** Start date of the current billing period */
  period_start?: string;
  /** End date of the current billing period */
  period_end?: string;
  [key: string]: unknown;
}

export interface PaymobSubscriptionExtras {
  organizationId?: string;
  planId?: string;
  subscriptionType?: string;
  userId?: string;
  billingCycle?: string;
  frequency?: number;
  [key: string]: unknown;
}

export interface PaymobSubscriptionWebhookOrder {
  id: number;
  created_at: string;
  delivery_needed?: boolean;
  merchant?: {
    id: number;
    company_name?: string;
    country?: string;
    city?: string;
    [key: string]: unknown;
  };
  amount_cents: number;
  currency: string;
  shipping_data?: PaymobSubscriptionBillingData & { id?: number; order_id?: number; order?: number; shipping_method?: string };
  items?: { name: string; description?: string; amount_cents: number; quantity?: number }[];
  payment_status?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PaymobSubscriptionBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  city?: string;
  country?: string;
  street?: string;
  state?: string;
  building?: string;
  apartment?: string;
  floor?: string;
  postal_code?: string;
  extra_description?: string;
  [key: string]: unknown;
}
