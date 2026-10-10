'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { PaymentProvider } from '@/lib/types/payment/payment.interface';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import type { AiPlanResponse } from '../ai-plan/ai-plan.action';

export interface AiSubscriptionUsage {
  dailyMessagesUsed: number;
  lastDailyReset: string;
}

export interface AiSubscriptionResponse {
  _id: string;
  userId: string | { _id: string; firstName: string; lastName: string; email: string };
  aiPlanId: string | AiPlanResponse;
  subscriberType: 'user' | 'organization';
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt: string | null;
  nextBillingAt: string | null;
  cancelledAt: string | null;
  usage: AiSubscriptionUsage;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiSubscriptionFilters {
  aiPlanId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface PaginatedAiSubscriptions {
  docs: AiSubscriptionResponse[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export async function getAiSubscriptions(
  options: { page?: number; limit?: number },
  filters?: AiSubscriptionFilters
) {
  return createAuthorizedNatsRequest<PaginatedAiSubscriptions>('ai-subscription.findAll', {
    options: { page: options.page ?? 1, limit: options.limit ?? 20 },
    filters,
  });
}

export async function getAiSubscription(id: string) {
  return createAuthorizedNatsRequest<AiSubscriptionResponse>('ai-subscription.findOne', { id });
}

export async function cancelAiSubscription(id: string) {
  return createAuthorizedNatsRequest<AiSubscriptionResponse>('ai-subscription.cancel', { id });
}

/** Get the current user's active AI subscription. Returns null when none is active. */
export async function getActiveAiSubscription(): Promise<AiSubscriptionResponse | null> {
  const result = await createAuthorizedNatsRequest<AiSubscriptionResponse | null>(
    'ai-subscription.findActiveByUser',
    {}
  );
  if (isNatsErrResult(result)) {
    throw new Error(result.err.message);
  }
  return result;
}

export type GetAiSubscriptionLinkResult = { url: string } | { error: string };

/**
 * Get a checkout URL for an AI plan subscription.
 * When `childUserId` is provided (parent flow), the subscription will be assigned to the child.
 */
export async function getAiSubscriptionLink(params: {
  aiPlanId: string;
  billingCycle?: BillingCycle;
  provider?: PaymentProvider;
  lemonSqueezyVariantId?: string;
  childUserId?: string;
}): Promise<GetAiSubscriptionLinkResult> {
  const {
    aiPlanId,
    billingCycle = BillingCycle.MONTHLY,
    provider = PaymentProvider.LEMON_SQUEEZY,
    lemonSqueezyVariantId,
    childUserId,
  } = params;

  const user = await getAuthUser();
  if (!user) return { error: 'You must be signed in to subscribe' };

  const phone = user.phone ?? '';
  const street = user.profile?.address?.street ?? '';
  const city = user.profile?.address?.city ?? '';
  const country = user.profile?.address?.country ?? 'EG';
  const countryCode = country === 'EG' ? 'EG' : (country?.slice(0, 2).toUpperCase() ?? 'EG');

  const basePayload = {
    subscriptionType: 'AI_PLAN' as const,
    aiPlanId,
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
    ...(childUserId ? { childUserId } : {}),
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
      'payment.subscribe-to-ai-plan',
      payload
    );
    if ('url' in result) return { url: result.url };
    return { error: 'Invalid subscription checkout response' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get AI subscription link';
    return { error: message };
  }
}
