import { PaymentProvider } from '../interfaces/payment-strategy.interface';
import { PaymobSubscriptionWebhookBody, PaymobSubscriptionWebhookObj } from '../../types/paymob/paymob-subscription-webhook.interface';
import { ProcessedSubscriptionWebhook } from '../../types/subscriptionWebhookBody.interface';

export function handlePaymobSubscriptionWebhook(body: PaymobSubscriptionWebhookBody): ProcessedSubscriptionWebhook {
  const obj: PaymobSubscriptionWebhookObj | undefined = body?.obj;
  const claims = obj?.payment_key_claims;
  const order = obj?.order;
  const sourceData = obj?.source_data;
  const extras = claims?.extra;

  const billingData = claims?.billing_data ?? obj?.billing_data;

  const isRenewal = claims?.is_renewal ?? (claims?.next_payment_intention != null && body?.type !== 'TRANSACTION');
  const frequency = claims?.frequency ?? extras?.frequency;
  const billingCycle = extras?.billingCycle;

  const periodStart = claims?.period_start ?? obj?.created_at;
  const periodEnd = claims?.period_end ?? (frequency && periodStart ? estimatePeriodEnd(periodStart, frequency) : undefined);
  const nextBillingDate = periodEnd;

  const cardToken =
    ((obj as Record<string, unknown>)?.card_token as string | undefined) ??
    (obj?.data?.card_token as string | undefined) ??
    ((obj as Record<string, unknown>)?.token as string | undefined);

  return {
    provider: PaymentProvider.PAYMOB,
    success: obj?.success ?? false,
    transactionId: obj?.id?.toString() ?? 'unknown',
    orderId: order?.id?.toString() ?? claims?.order_id?.toString(),
    amount: (obj?.amount_cents ?? 0) / 100,
    currency: obj?.currency ?? 'EGP',
    status: order?.payment_status ?? (obj?.success ? 'completed' : 'failed'),
    isLive: obj?.is_live,
    createdAt: obj?.created_at,

    billing: billingData
      ? {
          email: billingData.email,
          firstName: billingData.first_name,
          lastName: billingData.last_name,
          phone: billingData.phone_number,
          address: {
            city: billingData.city,
            country: billingData.country,
            street: billingData.street,
            state: billingData.state,
            building: billingData.building,
            postalCode: billingData.postal_code,
          },
        }
      : undefined,

    card:
      sourceData || cardToken
        ? {
            type: sourceData?.type,
            brand: sourceData?.sub_type,
            last4: typeof sourceData?.pan === 'string' ? sourceData.pan.slice(-4) : undefined,
            token: cardToken,
          }
        : undefined,

    subscription: {
      planId: claims?.subscription_plan_id,
      frequency,
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate,
      nextPaymentIntention: claims?.next_payment_intention,
      isTrial: claims?.is_trial,
      isRenewal: isRenewal ?? false,
    },

    metadata: {
      type: body?.type,
      organizationId: extras?.organizationId,
      planId: extras?.planId,
      userId: extras?.userId,
      subscriptionType: extras?.subscriptionType,
      integrationId: claims?.integration_id,
      acceptFees: body?.accept_fees,
      issuerBank: body?.issuer_bank,
    },
  };
}

function estimatePeriodEnd(startDateStr: string, frequencyDays: number): string {
  const start = new Date(startDateStr);
  start.setDate(start.getDate() + frequencyDays);
  return start.toISOString();
}
