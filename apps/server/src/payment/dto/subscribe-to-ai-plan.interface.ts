import { PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionType } from 'src/utils/enums/subscriptionType.enum';
import type { ISubscribeToPlanCustomer, ISubscribeToPlanBillingData } from './subscribe-to-plan.interface';

/**
 * Payload for subscribing a user to an AI plan.
 * The subscriber is always the authenticated user (payer).
 * When `childUserId` is set (parent flow), the AI subscription is assigned to the child.
 */
export interface ISubscribeToAiPlanPayload {
  subscriptionType: SubscriptionType.AI_PLAN;
  aiPlanId: string;
  billingCycle: BillingCycle;
  provider: PaymentProvider;
  customer: ISubscribeToPlanCustomer;
  billing_data: ISubscribeToPlanBillingData;
  /** Optional: ID of the child user to assign the AI subscription to (parent flow). */
  childUserId?: string;
  /** Lemon Squeezy: override variant ID from the AI plan's lemonSqueezyVariantIds. */
  lemonSqueezyVariantId?: string;
  /** Paymob: subscription frequency in days (30 = monthly, 365 = yearly). */
  frequency?: number;
  plan_type?: 'rent';
  use_transaction_amount?: boolean;
}
