import { PaymentProvider } from '../interfaces/payment-strategy.interface';
import { PaddleSubscriptionWebhookBody, PaddleSubscriptionEventType } from '../../types/paddle/paddle-subscription-webhook.interface';
import { ProcessedSubscriptionWebhook } from '../../types/subscriptionWebhookBody.interface';

/** Events that indicate a successful subscription or payment for fulfillment. */
const SUCCESS_EVENTS = new Set<PaddleSubscriptionEventType>([
  'subscription.created',
  'subscription.activated',
  'subscription.updated',
  'transaction.completed',
]);

/** Paddle transaction webhook payload (transaction.* events have a different data shape). */
export interface PaddleTransactionWebhookBody {
  event_id: string;
  event_type: 'transaction.completed' | 'transaction.payment_failed';
  occurred_at: string;
  notification_id: string;
  data: {
    id: string;
    status: string;
    subscription_id?: string;
    customer_id?: string;
    currency_code: string;
    total?: string;
    custom_data?: Record<string, unknown>;
  };
}

function isSubscriptionEvent(body: PaddleSubscriptionWebhookBody | PaddleTransactionWebhookBody): body is PaddleSubscriptionWebhookBody {
  const eventType = (body as PaddleSubscriptionWebhookBody).event_type;
  return typeof eventType === 'string' && eventType.startsWith('subscription.');
}

function parseSubscriptionData(body: PaddleSubscriptionWebhookBody): ProcessedSubscriptionWebhook {
  const data = body.data;
  const customData = (data.custom_data ?? {}) as { organizationId?: string; planId?: string };
  const item = data.items?.[0];
  const price = item?.price;
  const period = data.current_billing_period;

  return {
    provider: PaymentProvider.PADDLE,
    success: SUCCESS_EVENTS.has(body.event_type),
    transactionId: data.transaction_id ?? body.event_id,
    amount: price?.unit_price?.amount ? Number.parseFloat(price.unit_price.amount) / 100 : 0,
    currency: data.currency_code ?? price?.unit_price?.currency_code ?? 'USD',
    status: data.status,
    createdAt: data.created_at,
    subscription: {
      currentPeriodStart: period?.starts_at,
      currentPeriodEnd: period?.ends_at,
      nextBillingDate: data.next_billed_at ?? undefined,
      canceledAt: data.canceled_at ?? undefined,
    },
    metadata: {
      event_type: body.event_type,
      subscription_id: data.id,
      organizationId: customData.organizationId,
      planId: customData.planId,
      customer_id: data.customer_id,
    },
  };
}

function parseTransactionData(body: PaddleTransactionWebhookBody): ProcessedSubscriptionWebhook {
  const data = body.data;
  const customData = (data.custom_data ?? {}) as { organizationId?: string; planId?: string };
  return {
    provider: PaymentProvider.PADDLE,
    success: body.event_type === 'transaction.completed',
    transactionId: data.id,
    amount: data.total ? Number.parseFloat(data.total) / 100 : 0,
    currency: data.currency_code ?? 'USD',
    status: data.status,
    metadata: {
      event_type: body.event_type,
      subscription_id: data.subscription_id,
      organizationId: customData.organizationId,
      planId: customData.planId,
      customer_id: data.customer_id,
    },
  };
}

export function handlePaddleSubscriptionWebhook(body: PaddleSubscriptionWebhookBody | PaddleTransactionWebhookBody): ProcessedSubscriptionWebhook {
  if (isSubscriptionEvent(body)) {
    return parseSubscriptionData(body);
  }
  return parseTransactionData(body);
}
