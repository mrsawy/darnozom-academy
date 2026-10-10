import { PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionType } from 'src/utils/enums/subscriptionType.enum';

/** Customer info shared across subscription-to-plan payloads. */
export interface ISubscribeToPlanCustomer {
  userId: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
}

/** Billing address shared across subscription-to-plan payloads. */
export interface ISubscribeToPlanBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  street: string;
  city: string;
  country: string;
  country_code: string;
  apartment?: string;
  extra_description?: string;
}

/**
 * Abstraction for "subscribe to plan" payloads.
 * Provider-specific DTOs extend this and add provider-specific fields.
 */
export interface ISubscribeToPlanPayload {
  subscriptionType: SubscriptionType;
  planId: string;
  billingCycle: BillingCycle;
  provider: PaymentProvider;
  customer: ISubscribeToPlanCustomer;
  billing_data: ISubscribeToPlanBillingData;
  organizationId?: string;
}

/** Paymob-specific shape for subscribe-to-plan (plan_type, use_transaction_amount, frequency). */
export interface ISubscribeToPlanPaymobPayload extends ISubscribeToPlanPayload {
  provider: PaymentProvider.PAYMOB;
  frequency: number;
  plan_type: 'rent';
  use_transaction_amount: boolean;
}

/** Paddle-specific shape for subscribe-to-plan (extend with Paddle API fields as needed). */
export interface ISubscribeToPlanPaddlePayload extends ISubscribeToPlanPayload {
  provider: PaymentProvider.PADDLE;
  /** Paddle plan/price ID from Paddle catalog. */
  paddlePriceId?: string;
  /** Paddle-specific passthrough. */
  passthrough?: Record<string, unknown>;
}

/** Lemon Squeezy-specific shape for subscribe-to-plan (store + variant from plan). */
export interface ISubscribeToPlanLemonSqueezyPayload extends ISubscribeToPlanPayload {
  provider: PaymentProvider.LEMON_SQUEEZY;
  /** Override variant ID from plan's lemonSqueezyVariantIds. */
  lemonSqueezyVariantId?: string;
}

/** Discriminated union: payload type depends on provider. */
export type SubscribeToPlanPayload = ISubscribeToPlanPaymobPayload | ISubscribeToPlanPaddlePayload | ISubscribeToPlanLemonSqueezyPayload;
