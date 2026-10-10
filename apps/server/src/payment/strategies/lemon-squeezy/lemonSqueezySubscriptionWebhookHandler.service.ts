import { PaymentProvider } from '../interfaces/payment-strategy.interface';
import {
  LemonSqueezySubscriptionWebhookBody,
  LemonSqueezySubscriptionInvoiceWebhookBody,
  LemonSqueezySubscriptionWebhookPayload,
} from '../../types/lemon-squeezy/lemon-squeezy-subscription-webhook.interface';
import { ProcessedSubscriptionWebhook } from '../../types/subscriptionWebhookBody.interface';

/** Events we treat as successful for fulfillment (new subscription or payment collected). */
const SUCCESS_EVENTS = new Set<string>([
  'subscription_created',
  'subscription_updated',
  'subscription_resumed',
  'subscription_unpaused',
  'subscription_payment_success',
  'subscription_payment_recovered',
]);

function isSubscriptionEvent(body: LemonSqueezySubscriptionWebhookPayload): body is LemonSqueezySubscriptionWebhookBody {
  return body.data?.type === 'subscriptions';
}

function isSubscriptionInvoiceEvent(body: LemonSqueezySubscriptionWebhookPayload): body is LemonSqueezySubscriptionInvoiceWebhookBody {
  return body.data?.type === 'subscription-invoices';
}

function parseSubscriptionData(body: LemonSqueezySubscriptionWebhookBody): ProcessedSubscriptionWebhook {
  const eventName = body.meta.event_name;
  const attrs = body.data.attributes;
  const customData = body.meta.custom_data ?? {};
  const nameParts = attrs.user_name?.split(' ') ?? [];

  return {
    provider: PaymentProvider.LEMON_SQUEEZY,
    success: SUCCESS_EVENTS.has(eventName),
    transactionId: body.data.id,
    orderId: String(attrs.order_id),
    amount: 0,
    currency: 'USD',
    status: attrs.status,
    isLive: !body.meta.test_mode && !attrs.test_mode,
    createdAt: attrs.created_at,
    billing: {
      email: attrs.user_email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || undefined,
    },
    card: attrs.card_brand && attrs.card_last_four ? { brand: attrs.card_brand, last4: attrs.card_last_four } : undefined,
    subscription: {
      currentPeriodEnd: attrs.renews_at,
      nextBillingDate: attrs.renews_at,
      canceledAt: attrs.ends_at ?? undefined,
    },
    metadata: {
      event_name: eventName,
      subscription_id: body.data.id,
      order_id: attrs.order_id,
      variant_id: attrs.variant_id,
      product_id: attrs.product_id,
      ...customData,
    },
  };
}

function parseInvoiceData(body: LemonSqueezySubscriptionInvoiceWebhookBody): ProcessedSubscriptionWebhook {
  const eventName = body.meta.event_name;
  const attrs = body.data.attributes;
  const customData = body.meta.custom_data ?? {};
  const success = eventName === 'subscription_payment_success' || eventName === 'subscription_payment_recovered';
  /** Amounts are in cents; total_usd is in USD cents. */
  const amountUsd = (attrs.total_usd ?? attrs.total) / 100;

  return {
    provider: PaymentProvider.LEMON_SQUEEZY,
    success,
    transactionId: body.data.id,
    orderId: String(attrs.subscription_id),
    amount: amountUsd,
    currency: attrs.currency,
    status: attrs.status,
    isLive: !body.meta.test_mode && !attrs.test_mode,
    createdAt: attrs.created_at,
    billing: {
      email: attrs.user_email,
      firstName: attrs.user_name?.split(' ')[0],
      lastName: attrs.user_name?.split(' ').slice(1).join(' ') || undefined,
    },
    card: attrs.card_brand && attrs.card_last_four ? { brand: attrs.card_brand, last4: attrs.card_last_four } : undefined,
    metadata: {
      event_name: eventName,
      subscription_invoice_id: body.data.id,
      subscription_id: attrs.subscription_id,
      billing_reason: attrs.billing_reason,
      ...customData,
    },
  };
}

export function handleLemonSqueezySubscriptionWebhook(body: LemonSqueezySubscriptionWebhookPayload): ProcessedSubscriptionWebhook {
  if (isSubscriptionEvent(body)) {
    return parseSubscriptionData(body);
  }
  if (isSubscriptionInvoiceEvent(body)) {
    return parseInvoiceData(body);
  }
  throw new Error(`Unsupported Lemon Squeezy webhook data type: ${(body as { data?: { type?: string } }).data?.type}`);
}
