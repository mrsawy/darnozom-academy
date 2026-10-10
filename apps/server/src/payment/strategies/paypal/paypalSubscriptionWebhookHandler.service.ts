import { PaymentProvider } from '../interfaces/payment-strategy.interface';
import { PayPalWebhookBodyType } from '../../types/paypal/paybalWebhookBody.interface';
import { ProcessedSubscriptionWebhook } from '../../types/subscriptionWebhookBody.interface';

export function handlePaypalSubscriptionWebhook(body: PayPalWebhookBodyType): ProcessedSubscriptionWebhook {
  const eventType = body.event_type;
  const webhookId = body.id;

  if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const resource = body.resource;
    const customData = resource.custom_id ? safeParse(resource.custom_id) : {};
    const subscriber = resource.subscriber;
    const billingInfo = resource.billing_info;

    return {
      provider: PaymentProvider.PAYPAL,
      success: resource.status === 'ACTIVE',
      transactionId: resource.id,
      orderId: resource.id,
      amount: billingInfo?.outstanding_balance ? Number.parseFloat(billingInfo.outstanding_balance.value) : 0,
      currency: billingInfo?.outstanding_balance?.currency_code ?? 'USD',
      status: resource.status?.toLowerCase() ?? 'unknown',
      createdAt: resource.create_time,

      billing: {
        email: subscriber?.email_address,
        firstName: subscriber?.name?.given_name,
        lastName: subscriber?.name?.surname,
        address: subscriber?.shipping_address?.address
          ? {
              country: subscriber.shipping_address.address.country_code,
              city: subscriber.shipping_address.address.admin_area_2,
              state: subscriber.shipping_address.address.admin_area_1,
              postalCode: subscriber.shipping_address.address.postal_code,
              street: subscriber.shipping_address.address.address_line_1,
            }
          : undefined,
      },

      subscription: {
        planId: resource.plan_id,
        currentPeriodStart: resource.start_time,
        nextBillingDate: billingInfo?.next_billing_time,
        isRenewal: false,
      },

      metadata: {
        eventType,
        planOverridden: resource.plan_overridden,
        failedPaymentsCount: billingInfo?.failed_payments_count,
        cycleExecutions: billingInfo?.cycle_executions,
        ...customData,
      },
    };
  }

  if (eventType === 'PAYMENT.SALE.COMPLETED') {
    const resource = body.resource;

    return {
      provider: PaymentProvider.PAYPAL,
      success: resource.state === 'completed',
      transactionId: resource.id,
      amount: Number.parseFloat(resource.amount?.total ?? '0'),
      currency: resource.amount?.currency ?? 'USD',
      status: resource.state ?? 'unknown',
      createdAt: resource.create_time,

      subscription: {
        planId: resource.billing_agreement_id,
        isRenewal: true,
      },

      metadata: {
        eventType,
        transactionFee: resource.transaction_fee,
        billingAgreementId: resource.billing_agreement_id,
        invoiceNumber: resource.invoice_number,
        paymentMode: resource.payment_mode,
      },
    };
  }

  return {
    provider: PaymentProvider.PAYPAL,
    success: false,
    transactionId: webhookId ?? 'unknown',
    amount: 0,
    currency: 'USD',
    status: 'unhandled',
    metadata: { eventType },
  };
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
