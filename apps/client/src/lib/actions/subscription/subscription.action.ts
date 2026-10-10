'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { PaymentProvider } from '@/lib/types/payment/payment.interface';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';

/** Subscription type for organization plan (used by payment.subscribe-to-plan). */
const SUBSCRIPTION_TYPE_ORGANIZATION_PLAN = 'ORGANIZATION_PLAN';

/** Result: redirect URL (Paymob, Lemon Squeezy, etc.) or error. */
export type GetSubscriptionLinkResult = { url: string } | { error: string };

/**
 * Get subscription checkout for the given plan. Returns a redirect URL for Paymob or Lemon Squeezy.
 */
export async function getSubscriptionLink(params: {
  planId: string;
  billingCycle?: BillingCycle;
  provider?: PaymentProvider;
  /** Lemon Squeezy variant ID. Only used when provider is LEMON_SQUEEZY. */
  lemonSqueezyVariantId?: string;
}) {
  const {
    planId,
    billingCycle = BillingCycle.MONTHLY,
    provider = PaymentProvider.PAYMOB,
    lemonSqueezyVariantId,
  } = params;
  const user = await getAuthUser();
  if (!user) {
    return { error: 'You must be signed in to subscribe' };
  }
  if (!user.organizationId) {
    return { error: 'Organization context is required' };
  }
  const phone = user.phone ?? '';
  const street = user.profile?.address?.street ?? '';
  const city = user.profile?.address?.city ?? '';
  const country = user.profile?.address?.country ?? 'EG';
  const countryCode = country === 'EG' ? 'EG' : (country?.slice(0, 2).toUpperCase() ?? 'EG');

  const basePayload = {
    subscriptionType: SUBSCRIPTION_TYPE_ORGANIZATION_PLAN,
    planId,
    billingCycle,
    provider,
    customer: {
      userId: user._id,
      first_name: user.firstName,
      last_name: user.lastName,
      phone_number: phone,
      email: user.email,
    },
    billing_data: {
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone_number: phone,
      street: street || 'N/A',
      city: city || 'N/A',
      country,
      country_code: countryCode,
      apartment: '',
      extra_description: '',
    },
  };

  const payload =
    provider === PaymentProvider.LEMON_SQUEEZY
      ? { ...basePayload, ...(lemonSqueezyVariantId ? { lemonSqueezyVariantId } : {}) }
      : {
          ...basePayload,
          frequency: billingCycle === BillingCycle.MONTHLY ? 30 : 365,
          plan_type: 'rent' as const,
          use_transaction_amount: true,
        };

  try {
    const result = await createAuthorizedNatsRequest<{ url: string }>(
      'payment.subscribe-to-plan',
      payload
    );
    if ('url' in result) return { url: result.url };
    return { error: 'Invalid subscription checkout response' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get subscription link';
    return { error: message };
  }
}

export interface SubscriptionBilling {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  amount: number;
  currency: string;
  billingCycle: string;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  description?: string;
  tier: string;
  price?: { MONTHLY?: number; YEARLY?: number; ONE_TIME?: number };
  features?: {
    trackingStudentProgress?: boolean;
    pagesPerSubscription?: number;
    [key: string]: unknown;
  };
  taxPercentage?: number;
}

/** Mirrors server `Subscription.usage` (plan limit checks use these counters). */
export interface SubscriptionUsageSnapshot {
  usersUsed: number;
  coursesUsed: number;
  pagesUsed: number;
  parentUsersUsed: number;
  storageUsedGB: number;
  liveSessionsUsed: number;
  assignmentsUsed: number;
}

export interface ActiveSubscriptionResponse {
  _id: string;
  organizationId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt: string | null;
  nextBillingAt: string | null;
  transactionId: string | null;
  billing: SubscriptionBilling | null;
  reminderDays?: number;
  createdAt: string;
  updatedAt: string;
  usage?: SubscriptionUsageSnapshot;
}

export async function getActiveSubscription() {
  return createAuthorizedNatsRequest<ActiveSubscriptionResponse | null>(
    'subscription.findActiveByOrganization',
    {}
  );
}
