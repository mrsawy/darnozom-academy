import { PaymentProvider } from '../interfaces/payment-strategy.interface';
import { KashierSubscriptionWebhookBody } from '../../types/kashier/kashier-subscription-webhook.interface';
import { ProcessedSubscriptionWebhook } from '../../types/subscriptionWebhookBody.interface';

const SUCCESS_EVENTS = new Set(['subscription.created', 'subscription.renewed']);

export function handleKashierSubscriptionWebhook(body: KashierSubscriptionWebhookBody): ProcessedSubscriptionWebhook {
  const { event, data } = body;
  const isSuccess = SUCCESS_EVENTS.has(event) && data.status === 'ACTIVE';
  const isRenewal = event === 'subscription.renewed';
  const isCancelled = event === 'subscription.cancelled';

  return {
    provider: PaymentProvider.KASHIER,
    success: isSuccess,
    transactionId: data.transactionId ?? data.subscriptionId,
    orderId: data.orderId,
    amount: data.amount ?? 0,
    currency: data.currency ?? 'EGP',
    status: data.status?.toLowerCase() ?? (isSuccess ? 'completed' : 'failed'),
    createdAt: data.createdAt,

    billing: data.customer
      ? {
          email: data.customer.email,
          firstName: data.customer.name,
          phone: data.customer.phone,
        }
      : undefined,

    card:
      data.cardBrand || data.cardLastFour
        ? {
            brand: data.cardBrand,
            last4: data.cardLastFour,
            token: data.cardToken,
          }
        : undefined,

    subscription: {
      planId: data.plan?.planId,
      billingCycle: data.plan?.interval ? `${data.plan.intervalCount ?? 1} ${data.plan.interval}` : undefined,
      nextBillingDate: data.nextBillingDate,
      isRenewal,
      canceledAt: isCancelled ? data.createdAt : undefined,
    },

    metadata: {
      event,
      merchantOrderId: data.merchantOrderId,
      paymentMethod: data.paymentMethod,
      planName: data.plan?.name,
      ...data.metadata,
    },
  };
}
