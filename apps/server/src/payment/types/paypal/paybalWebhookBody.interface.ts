export interface PayPalWebhookLink {
  href: string;
  rel: string;
  method: string;
  encType?: string;
}

export interface PayPalSubscriber {
  email_address: string;
  payer_id: string;
  name: {
    given_name: string;
    surname: string;
  };
  tenant: string;
  shipping_address?: {
    name: { full_name: string };
    address: {
      address_line_1: string;
      admin_area_1: string;
      admin_area_2: string;
      postal_code: string;
      country_code: string;
    };
  };
}

export interface PayPalCycleExecution {
  tenure_type: string;
  sequence: number;
  cycles_completed: number;
  cycles_remaining: number;
  current_pricing_scheme_version: number;
  total_cycles: number;
}

export interface PayPalBillingInfo {
  outstanding_balance: {
    currency_code: string;
    value: string;
  };
  cycle_executions: PayPalCycleExecution[];
  next_billing_time: string;
  final_payment_time: string;
  failed_payments_count: number;
}

export interface PayPalSubscriptionResource {
  id: string;
  plan_id: string;
  plan_overridden: boolean;
  status: string;
  start_time: string;
  create_time: string;
  update_time?: string;
  status_update_time?: string;
  shipping_amount?: Record<string, unknown>;
  quantity: string;
  subscriber: PayPalSubscriber;
  billing_info?: PayPalBillingInfo;
  links: PayPalWebhookLink[];
  custom_id: string;
}

export interface PayPalAmount {
  total: string;
  currency: string;
  details?: {
    subtotal?: string;
    shipping?: string;
    tax?: string;
    shipping_discount?: string;
  };
}

export interface PayPalTransactionFee {
  currency: string;
  value: string;
}

export interface PayPalSaleResource {
  id: string; // Transaction ID
  state: string; // e.g., "completed"
  amount: PayPalAmount;
  payment_mode?: string; // e.g., "INSTANT_TRANSFER"
  transaction_fee?: PayPalTransactionFee;
  billing_agreement_id: string; // Links to subscription
  create_time: string;
  update_time: string;
  invoice_number?: string;
  parent_payment?: string;
  links: PayPalWebhookLink[];
}

export interface PayPalWebhookBody<TResource = unknown, TEvent = string> {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: 'subscription';
  resource_version: string;
  event_type: TEvent;
  summary: string;
  resource: TResource;
  links: PayPalWebhookLink[];
}

export type PayPalSubscriptionCreatedWebhookBody = PayPalWebhookBody<PayPalSubscriptionResource, 'BILLING.SUBSCRIPTION.ACTIVATED'>;

export type PayPalSaleWebhookBody = PayPalWebhookBody<PayPalSaleResource, 'PAYMENT.SALE.COMPLETED'>;

export type PayPalWebhookBodyType = PayPalSubscriptionCreatedWebhookBody | PayPalSaleWebhookBody;
