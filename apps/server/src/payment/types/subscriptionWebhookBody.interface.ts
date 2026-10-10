import { PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { PaymobSubscriptionWebhookBody } from './paymob/paymob-subscription-webhook.interface';
import { PayPalWebhookBodyType } from './paypal/paybalWebhookBody.interface';
import { KashierSubscriptionWebhookBody } from './kashier/kashier-subscription-webhook.interface';
import { PaddleSubscriptionWebhookBody } from './paddle/paddle-subscription-webhook.interface';
import { StripeSubscriptionWebhookBody } from './stripe/stripe-subscription-webhook.interface';
import { LemonSqueezySubscriptionWebhookPayload } from './lemon-squeezy/lemon-squeezy-subscription-webhook.interface';

export type SubscriptionWebhookBody =
  | PaymobSubscriptionWebhookBody
  | PayPalWebhookBodyType
  | KashierSubscriptionWebhookBody
  | PaddleSubscriptionWebhookBody
  | StripeSubscriptionWebhookBody
  | LemonSqueezySubscriptionWebhookPayload;

export interface ProcessedSubscriptionWebhook {
  provider: PaymentProvider;
  success: boolean;
  transactionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: string;
  isLive?: boolean;
  createdAt?: string;

  billing?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: {
      city?: string;
      country?: string;
      street?: string;
      state?: string;
      building?: string;
      postalCode?: string;
    };
  };

  card?: {
    type?: string;
    brand?: string;
    last4?: string;
    token?: string;
  };

  subscription?: {
    planId?: string;
    frequency?: number;
    billingCycle?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    nextBillingDate?: string;
    nextPaymentIntention?: string;
    trialStart?: string;
    trialEnd?: string;
    isTrial?: boolean;
    isRenewal?: boolean;
    canceledAt?: string;
  };

  metadata?: Record<string, unknown>;
}
