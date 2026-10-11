import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  IPaymentStrategy,
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  ProcessedWebhook,
  PaymentPurpose,
  SubscriptionCheckoutResult,
} from '../interfaces/payment-strategy.interface';
import { URLS } from 'src/utils/constants';
import { TransactionStatus } from 'src/transaction/entities/transaction.entity';
import { PaymobWebhookTransaction } from '../../types/transaction.interface';
import { Currency } from '@darnozom/shared-types';
import type { SubscribeToPlanPayload } from '../../dto/subscribe-to-plan.interface';
import type { ISubscribeToAiPlanPayload } from '../../dto/subscribe-to-ai-plan.interface';
import { Plan } from 'src/plan/entities/plan.entity';
import { AiPlan } from 'src/ai-plan/entities/ai-plan.entity';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { PaymobSubscriptionPlan } from '../../types/paymob/PaymobSubscriptionPlan.interface';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { Frequency } from 'src/utils/types/Frequency.enum';
import { QueryService } from 'src/database/query';
import { UserDocument } from 'src/user/entities/user.entity';
import type { SubscriptionWebhookDto } from 'src/subscription/dto/subscription-webhook.dto';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

const PAYMOB_SUBSCRIPTION_PLANS_PATH = '/api/acceptance/subscription-plans';
const PAYMOB_INTENTION_PATH = '/v1/intention/';
// const PAYMOB_SUBSCRIPTION_PATH = '/api/acceptance/subscriptions';
// const PAYMOB_SUBSCRIPTION_PATH = '/api/acceptance/subscriptions';
// const PAYMOB_SUBSCRIPTION_PATH = '/api/acceptance/subscriptions';

/**
 * Paymob only accepts specific frequency values (in days):
 * 1, 7, 14, 30, 60, 90, 180, 360
 */
function toPaymobFrequency(days: number): number {
  const allowed = [1, 7, 14, 30, 60, 90, 180, 360];
  const exact = allowed.find((v) => v === days);
  if (exact) return exact;
  let closest = allowed[0];
  for (const curr of allowed) {
    if (Math.abs(curr - days) < Math.abs(closest - days)) closest = curr;
  }
  return closest;
}

/**
 * Paymob `/v1/intention/` expects integration IDs (integers) for Unified Checkout.
 * Set `CREDIT_CARD_INTEGRATION_ID` and `WALLET_INTEGRATION_ID` in env; otherwise
 * `S_INTEGRATION` / `WALLET_METHOD_NAME` string aliases are used (may fail with 4xx).
 */
function nonEmptyOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') return fallback;
  return trimmed;
}

function resolveIntentionPaymentMethods(): number[] | string[] {
  const ids: number[] = [];
  const card = process.env.CREDIT_CARD_INTEGRATION_ID;
  const wallet = process.env.WALLET_INTEGRATION_ID;
  if (card) {
    const n = Number(card);
    if (!Number.isNaN(n) && n > 0) ids.push(n);
  }
  if (wallet) {
    const n = Number(wallet);
    if (!Number.isNaN(n) && n > 0) ids.push(n);
  }
  if (ids.length > 0) return ids;
  const cardMethod = nonEmptyOr(process.env.S_INTEGRATION, 'creditcard');
  const walletMethod = nonEmptyOr(process.env.WALLET_METHOD_NAME, 'paywallet');
  return [cardMethod, walletMethod];
}

/**
 * Browser return URL after Paymob checkout. Must match routes that exist on the
 * Next client — `/dashboard` is not a real page (locale + role dashboards are).
 */
function intentionRedirectionUrl(purpose: PaymentPurpose, isParentPurchase = false): string {
  if (purpose === PaymentPurpose.PRIVATE_SESSION_PURCHASE) {
    return URLS.bookingsPage;
  }
  if (purpose === PaymentPurpose.COURSE_PURCHASE) {
    return isParentPurchase ? URLS.parentDashboardPage : URLS.enrollmentsPage;
  }
  return URLS.walletPage;
}

/**
 * Paymob extras expect the same `courseId` + `billingCycle` shape as course purchases.
 * For private sessions, pass the private session Mongo id in `courseId` (webhook uses `purpose` + `bookingId`).
 */
function resolveCourseIdForPaymobExtras(request: PaymentRequest): string | undefined {
  if (request.course?._id) {
    return request.course._id.toString();
  }
  const meta = request.metadata;
  if (meta?.courseId != null && meta.courseId !== '') {
    return String(meta.courseId);
  }
  if (request.purpose === PaymentPurpose.PRIVATE_SESSION_PURCHASE && meta?.sessionId != null) {
    return String(meta.sessionId);
  }
  return undefined;
}

/** Response from Paymob Create Subscription API; used to redirect customer to Unified Checkout for first payment. */
export interface PaymobCreateSubscriptionResponse {
  id?: number;
  client_secret?: string;
  payment_url?: string;
  intention_id?: string;
  order_id?: string;
}

@Injectable()
export class PaymobStrategy implements IPaymentStrategy {
  private readonly logger = new Logger(PaymobStrategy.name);
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(private readonly queryService: QueryService) {}

  getProvider(): PaymentProvider {
    return PaymentProvider.PAYMOB;
  }

  async createPaymentUrl(request: PaymentRequest): Promise<PaymentResponse> {
    // const token = await this.getAuthToken();

    const bd = request.billingData;
    const country = bd?.address?.country ?? 'EG';
    /** Intention API often rejects minimal billing; mirror subscription intention shape. */
    const billing_data = {
      apartment: 'NA',
      email: bd?.email ?? request.user.email,
      floor: 'NA',
      first_name: bd?.firstName ?? request.user.firstName,
      last_name: bd?.lastName ?? request.user.lastName,
      street: 'NA',
      building: 'NA',
      phone_number: bd?.phone ?? request.user.phone ?? '201275881277',
      city: 'NA',
      country,
      state: 'NA',
      country_code: bd?.address?.countryCode ?? country,
    };

    let itemName = 'Course';
    let itemDescription = 'Course';
    if (request.purpose === PaymentPurpose.WALLET_CREDIT) {
      itemName = 'Wallet Credit';
      itemDescription = 'Increasing your wallet balance';
    } else if (request.purpose === PaymentPurpose.PRIVATE_SESSION_PURCHASE) {
      itemName = 'Private session';
      itemDescription = 'Private tutoring session';
    } else if (request.course) {
      itemName = request.course.name;
      itemDescription = request.course.description ?? request.course.name;
    }

    const courseIdStr = resolveCourseIdForPaymobExtras(request);

    const requestBody = {
      amount: request.amount * 100,
      currency: request.currency,
      payment_methods: resolveIntentionPaymentMethods(),
      items: [
        {
          name: itemName,
          amount: request.amount * 100,
          description: itemDescription,
          quantity: 1,
        },
      ],
      billing_data,
      customer: {
        first_name: request.user.firstName,
        last_name: request.user.lastName,
        email: request.user.email,
        // Same three keys as course purchase — extra keys here have broken Paymob intention for some merchants.
        extras: {
          userId: request.user._id.toString(),
          courseId: courseIdStr,
          billingCycle: request.billingCycle,
        },
      },
      extras: {
        userId: request.user._id.toString(),
        courseId: courseIdStr,
        billingCycle: request.billingCycle,
        provider: PaymentProvider.PAYMOB,
        purpose: request.purpose,
        ...(request.metadata?.parentId ? { parentId: request.metadata.parentId } : {}),
        ...(request.metadata?.childId ? { childId: request.metadata.childId } : {}),
        ...(request.metadata?.bookingId ? { bookingId: String(request.metadata.bookingId) } : {}),
        ...(request.metadata?.sessionId ? { sessionId: String(request.metadata.sessionId) } : {}),
        ...(request.metadata?.slotId ? { slotId: String(request.metadata.slotId) } : {}),
        ...(request.metadata?.studentId ? { studentId: String(request.metadata.studentId) } : {}),
        ...(request.metadata?.payerUserId ? { payerUserId: String(request.metadata.payerUserId) } : {}),
        ...(request.metadata?.notes ? { notes: String(request.metadata.notes).slice(0, 500) } : {}),
        ...(request.metadata?.organizationId ? { organizationId: String(request.metadata.organizationId) } : {}),
      },
      notification_url: URLS.paymentWebhookPage,
      redirection_url: intentionRedirectionUrl(request.purpose, Boolean(request.metadata?.parentId)),
    };

    let response: { data: { client_secret?: string; id?: string } };
    try {
      response = await axios.post<{ client_secret?: string; id?: string }>(`${process.env.PAYMOB_BASEURL}/v1/intention/`, requestBody, {
        headers: {
          Authorization: 'Token ' + process.env.PAYMOB_SECRET_KEY,
          'Content-Type': 'application/json',
        },
      });
    } catch (err: unknown) {
      const axErr = err as AxiosError;
      const status = axErr.response?.status;
      const data = axErr.response?.data;
      this.logger.error(`[Paymob intention failed] status=${status} ${data == null ? axErr.message : JSON.stringify(data)}`);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Paymob intention request body: ${JSON.stringify(requestBody)}`);
      }
      throw err;
    }
    const result = response.data;

    return {
      paymentUrl: `${process.env.PAYMOB_BASEURL}/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY}&clientSecret=${result.client_secret ?? ''}`,
      paymentId: result.id ?? '',
      // expiresAt: new Date(response.data.expires_at),
      provider: PaymentProvider.PAYMOB,
    };
  }

  processWebhook(payload: WebhookPayload): Promise<ProcessedWebhook> {
    const { obj } = payload.rawPayload as PaymobWebhookTransaction;

    if (obj && !obj.success) {
      return Promise.resolve({
        success: false,
        transactionId: obj.id.toString(),
        amount: 0,
        currency: (obj?.currency as Currency) ?? Currency.EGP,
        status: TransactionStatus.FAILED,
        metadata: {},
      });
    }
    const extra = obj.payment_key_claims?.extra as Record<string, unknown> | undefined;

    return Promise.resolve({
      success: true,
      transactionId: obj.id.toString(),
      amount: Number(obj.amount_cents) / 100,
      currency: (obj.payment_key_claims?.currency as Currency) ?? Currency.EGP,
      status: TransactionStatus.COMPLETED,
      metadata: {
        userId: extra?.userId,
        courseId: extra?.courseId,
        billingCycle: extra?.billingCycle,
        purpose: extra?.purpose,
        parentId: extra?.parentId,
        childId: extra?.childId,
        bookingId: extra?.bookingId,
        sessionId: extra?.sessionId,
        slotId: extra?.slotId,
        studentId: extra?.studentId,
        payerUserId: extra?.payerUserId,
        notes: extra?.notes,
        organizationId: extra?.organizationId,
        email: (obj.payment_key_claims?.billing_data as { email?: unknown } | undefined)?.email,
        billingData: obj.billing_data,
      },
    });
  }

  verifyWebhook(_payload: unknown, _signature?: string, _rawBody?: string): boolean {
    // Implement Paymob webhook signature verification
    // This is a simplified version - implement actual verification
    return true;
  }

  async getPaymentStatus(paymentId: string): Promise<ProcessedWebhook> {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${process.env.PAYMOB_BASEURL}/api/acceptance/transactions/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const transaction = response.data as { success?: boolean; id?: string; amount_cents?: number; currency?: string; billing_data?: unknown };

      return {
        success: transaction.success ?? false,
        transactionId: transaction.id ?? '',
        amount: (transaction.amount_cents ?? 0) / 100,
        currency: (transaction.currency ?? 'EGP') as Currency,
        status: transaction.success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED,
        metadata: {
          billingData: transaction.billing_data,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to fetch payment status: ${errorMessage}`);
    }
  }

  private async getAuthToken(): Promise<string> {
    // Token caching to avoid repeated auth calls
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    const response = await axios.post(`${process.env.PAYMOB_BASEURL}/api/auth/tokens`, {
      api_key: process.env.PAYMOB_API_KEY,
    });

    const responseData = response.data as { token?: string };
    this.cachedToken = {
      token: responseData.token ?? '',
      expiresAt: Date.now() + 3_600_000,
    };

    return this.cachedToken.token;
  }

  /**
   * Returns a Paymob unified-checkout URL for plan/subscription payment.
   * Resolves or creates the subscription plan on Paymob, then creates a subscription and returns the checkout URL.
   */
  async getSubscriptionPaymentUrl(dto: SubscribeToPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult> {
    if (dto.provider !== PaymentProvider.PAYMOB) {
      throw new BadRequestException('Paymob strategy only supports PAYMOB provider');
    }
    try {
      const token = await this.getAuthToken();
      const organizationId = dto.organizationId ?? user.organizationId?.toString();
      const userId = 'userId' in dto && dto.userId ? dto.userId : dto.customer.userId;
      const { planId, subscriptionType, billingCycle, billing_data } = dto;

      const plan = await this.queryService.findOneOrThrow<Plan>(Plan.name, { _id: planId }, 'Plan not found');
      const { price, currency } = this.getPlanPricing(
        plan,
        billingCycle === BillingCycle.MONTHLY ? Frequency.MONTHLY : Frequency.YEARLY,
        user.preferredCurrency as Currency
      );
      const frequencyDays = billingCycle === BillingCycle.MONTHLY ? Frequency.MONTHLY : Frequency.YEARLY;
      const paymobFrequency = toPaymobFrequency(frequencyDays);
      const amountCents = Math.round(price * 100);

      const planPayload = JSON.stringify({
        name: plan.name,
        organizationId,
        planId,
        userId,
        subscriptionType,
        frequency: paymobFrequency,
      });

      const paymobPlan = await this.findOrCreateSubscriptionPlan(token, planPayload, paymobFrequency, amountCents, currency);

      const subscriptionBody: CreateSubscriptionDto = {
        amount: paymobPlan.amount_cents,
        currency: Currency.EGP,
        payment_methods: ['creditcard', 'paypal'],
        subscription_plan_id: Number(paymobPlan.id),
        items: [{ name: plan.name, description: plan.description, amount: amountCents }],
        billing_data: billing_data as CreateSubscriptionDto['billing_data'],
        extras: { organizationId, planId, subscriptionType },
      };

      const subscription = await this.createPaymobSubscription(token, subscriptionBody);

      const url =
        subscription.payment_url ??
        `${process.env.PAYMOB_BASEURL}/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY}&clientSecret=${subscription.client_secret ?? ''}`;
      return { url };
    } catch (error: unknown) {
      const detail = extractAxiosErrorDetail(error, 'Failed to create subscription payment URL');
      throw new BadRequestException(detail);
    }
  }

  private async findOrCreateSubscriptionPlan(
    token: string,
    planPayload: string,
    frequencyDays: number,
    amountCents: number,
    currency: Currency
  ): Promise<PaymobSubscriptionPlan> {
    const plans = await this.listPaymobSubscriptionPlans(token);
    const existing = plans.find((p) => p.name === planPayload);
    if (existing) return existing;

    const body: Omit<PaymobSubscriptionPlan, 'id' | 'created_at' | 'updated_at'> = {
      frequency: frequencyDays,
      name: planPayload,
      reminder_days: Math.max(0, frequencyDays - 3),
      retrial_days: 1,
      plan_type: 'rent',
      amount_cents: amountCents,
      use_transaction_amount: true,
      is_active: true,
      integration: Number(process.env.CREDIT_CARD_INTEGRATION_ID),
      webhook_url: `${process.env.SECURED_BASE_URL}/payment/subscription/webhook/paymob`,
      currency: currency,
    };
    const newPlan = await this.createPaymobSubscriptionPlan(token, body);
    return newPlan;
  }

  private async listPaymobSubscriptionPlans(token: string): Promise<PaymobSubscriptionPlan[]> {
    interface PaymobPlansResponse {
      results?: PaymobSubscriptionPlan[];
      next?: string | null;
      previous?: string | null;
    }

    const authHeaders = { Authorization: `Bearer ${token}` };
    const allPlans: PaymobSubscriptionPlan[] = [];

    try {
      const base = process.env.PAYMOB_BASEURL;
      let url = `${base}${PAYMOB_SUBSCRIPTION_PLANS_PATH}`;
      const initialParams = { page: 1 };

      while (true) {
        const res = await axios.get<PaymobPlansResponse>(url, {
          headers: authHeaders,
          ...(url === `${base}${PAYMOB_SUBSCRIPTION_PLANS_PATH}` ? { params: initialParams } : {}),
        });
        const data = res.data?.results;
        if (Array.isArray(data)) allPlans.push(...data);

        const nextUrl = res.data?.next;
        if (typeof nextUrl !== 'string' || nextUrl.trim() === '') {
          break;
        }
        url = nextUrl;
      }

      return allPlans;
    } catch (error) {
      const detail = extractAxiosErrorDetail(error, 'Failed to list Paymob subscription plans');
      throw new BadRequestException(detail);
    }
  }

  private async createPaymobSubscriptionPlan(
    token: string,
    body: Omit<PaymobSubscriptionPlan, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PaymobSubscriptionPlan> {
    const base = process.env.PAYMOB_BASEURL;
    const res = await axios.post<PaymobSubscriptionPlan>(`${base}${PAYMOB_SUBSCRIPTION_PLANS_PATH}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return res.data;
  }

  /**
   * Creates a Paymob subscription and returns the intention (client_secret) and payment URL
   * for the customer to complete the first payment via Unified Checkout.
   * See: https://developers.paymob.com/paymob-docs/developers/subscription/create-subscription
   */
  private async createPaymobSubscription(token: string, body: CreateSubscriptionDto): Promise<PaymobCreateSubscriptionResponse> {
    try {
      const base = process.env.PAYMOB_BASEURL;
      const publicKey = process.env.PAYMOB_PUBLIC_KEY;

      const billing = body.billing_data;
      const billing_data: Record<string, string> = {
        apartment: billing.apartment ?? 'dumy',
        first_name: billing.first_name,
        last_name: billing.last_name,
        street: billing.street,
        building: billing.building ?? 'dumy',
        phone_number: billing.phone_number,
        city: billing.city,
        country: billing.country,
        email: billing.email,
        floor: billing.floor ?? 'dumy',
        state: (billing as unknown as Record<string, string>).state ?? 'dumy',
      };
      if (billing.extra_description != null) billing_data.extra_description = billing.extra_description;
      if (billing.country_code != null) billing_data.country_code = billing.country_code;

      const extras: Record<string, unknown> = {
        ...(body.extras && typeof body.extras === 'object' ? body.extras : {}),
        subscription_plan_id: body.subscription_plan_id,
      };

      const requestBody = {
        amount: body.amount,
        currency: body.currency,
        payment_methods: body.payment_methods,
        items: (body.items ?? []).map((item) => ({
          name: item.name,
          amount: item.amount,
          description: item.description ?? item.name,
          quantity: 1,
        })),
        billing_data,
        extras,
        // special_reference: `sub-${body.subscription_plan_id}-${Date.now()}`,
        // expiration: 3600,
        notification_url: `${process.env.SECURED_BASE_URL ?? ''}/payment/subscription/webhook/paymob`,
        redirection_url: URLS.paymentWebhookPage ?? '',
      };

      const response = await axios.post<PaymobCreateSubscriptionResponse>(`${base}${PAYMOB_INTENTION_PATH}`, requestBody, {
        headers: {
          Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data as Record<string, unknown>;
      const clientSecret = (data.client_secret as string | undefined) ?? '';
      if (!clientSecret) {
        throw new BadRequestException('Paymob Create Subscription did not return client_secret for checkout');
      }

      const paymentUrl = `${base}/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}`;

      return {
        id: data.id as number | undefined,
        client_secret: clientSecret,
        payment_url: (data.payment_url as string | undefined) ?? paymentUrl,
        intention_id: data.intention_id as string | undefined,
        order_id: data.order_id == null ? undefined : String(data.order_id),
      };
    } catch (error: unknown) {
      const detail = extractAxiosErrorDetail(error, 'Failed to create Paymob subscription');
      throw new BadRequestException(detail);
    }
  }

  async getAiSubscriptionPaymentUrl(dto: ISubscribeToAiPlanPayload, user: UserDocument): Promise<SubscriptionCheckoutResult> {
    try {
      const token = await this.getAuthToken();
      const { aiPlanId, billingCycle, billing_data, childUserId } = dto;
      const userId = user._id.toString();

      const aiPlan = await this.queryService.findOneOrThrow<AiPlan>(AiPlan.name, { _id: aiPlanId }, 'AI plan not found');
      const pricing = this.getAiPlanPricing(
        aiPlan,
        billingCycle === BillingCycle.MONTHLY ? Frequency.MONTHLY : Frequency.YEARLY,
        user.preferredCurrency as Currency
      );
      const frequencyDays = billingCycle === BillingCycle.MONTHLY ? Frequency.MONTHLY : Frequency.YEARLY;
      const paymobFrequency = toPaymobFrequency(frequencyDays);
      const amountCents = Math.round(pricing.price * 100);

      const planPayload = JSON.stringify({
        name: aiPlan.name,
        aiPlanId,
        userId,
        subscriptionType: 'AI_PLAN',
        frequency: paymobFrequency,
        ...(childUserId ? { childUserId } : {}),
      });

      const paymobPlan = await this.findOrCreateSubscriptionPlan(token, planPayload, paymobFrequency, amountCents, pricing.currency);

      const subscriptionBody: CreateSubscriptionDto = {
        amount: paymobPlan.amount_cents,
        currency: Currency.EGP,
        payment_methods: ['creditcard', 'paypal'],
        subscription_plan_id: Number(paymobPlan.id),
        items: [{ name: aiPlan.name, description: aiPlan.description, amount: amountCents }],
        billing_data: billing_data as CreateSubscriptionDto['billing_data'],
        extras: { aiPlanId, subscriptionType: 'AI_PLAN', userId, ...(childUserId ? { childUserId } : {}) },
      };

      const subscription = await this.createPaymobSubscription(token, subscriptionBody);

      const url =
        subscription.payment_url ??
        `${process.env.PAYMOB_BASEURL}/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY}&clientSecret=${subscription.client_secret ?? ''}`;
      return { url };
    } catch (error: unknown) {
      const detail = extractAxiosErrorDetail(error, 'Failed to create AI subscription payment URL');
      throw new BadRequestException(detail);
    }
  }

  /**
   * Parses a Paymob subscription/intention notification webhook.
   * Paymob sends the same payload format as regular payment webhooks: `{ obj: { ... } }`.
   * The extras (aiPlanId, userId, subscriptionType, organizationId, etc.) are in
   * `obj.payment_key_claims.extra` – the same place as one-time payment metadata.
   */
  processSubscriptionWebhook(body: unknown): SubscriptionWebhookDto | null {
    try {
      const payload = body as { obj?: Record<string, unknown> };
      const obj = payload?.obj;
      if (!obj) return null;

      const success = obj.success === true;
      const transactionId = String(obj.id ?? '');
      const amountCents = Number(obj.amount_cents ?? 0);
      const currency = (obj.currency as string | undefined) ?? 'EGP';

      const extra = (obj.payment_key_claims as Record<string, unknown> | undefined)?.extra as Record<string, unknown> | undefined;
      if (!extra) return null;

      const subscriptionType = extra.subscriptionType as string | undefined;
      const aiPlanId = extra.aiPlanId as string | undefined;
      const userId = extra.userId as string | undefined;
      const organizationId = extra.organizationId as string | undefined;
      const planId = extra.planId as string | undefined;
      const billingCycle = (extra.billingCycle as BillingCycle | undefined) ?? BillingCycle.MONTHLY;
      const childUserId = extra.childUserId as string | undefined;

      // Must have either AI plan identifiers or org plan identifiers
      if (!aiPlanId && !organizationId) return null;

      const billingData = obj.billing_data as Record<string, unknown> | undefined;
      const billing =
        success && amountCents > 0
          ? {
              email: (billingData?.email as string | undefined) ?? '',
              firstName: (billingData?.first_name as string | undefined) ?? '',
              lastName: (billingData?.last_name as string | undefined) ?? '',
              amount: amountCents / 100,
              currency,
              billingCycle,
            }
          : null;

      return {
        eventName: 'paymob_subscription_payment',
        success,
        organizationId: organizationId ?? '',
        planId: planId ?? '',
        externalSubscriptionId: transactionId,
        transactionId,
        status: success ? SubscriptionStatus.ACTIVE : SubscriptionStatus.SUSPENDED,
        billingCycle,
        nextBillingAt: null,
        endsAt: null,
        cancelledAt: null,
        billing,
        metadata: {
          ...extra,
          subscriptionType,
          aiPlanId,
          userId,
          ...(childUserId ? { childUserId } : {}),
        },
      };
    } catch {
      return null;
    }
  }

  private getAiPlanPricing(aiPlan: AiPlan, frequency: number, userCurrency?: Currency): { price: number; currency: Currency } {
    const cycle = frequency === Number(Frequency.MONTHLY) ? BillingCycle.MONTHLY : BillingCycle.YEARLY;
    const pricing = aiPlan.price?.[cycle];
    if (!pricing) return { price: 0, currency: Currency.USD };
    if (userCurrency && userCurrency === pricing.originalCurrency) {
      return { price: pricing.originalPrice, currency: pricing.originalCurrency };
    }
    return { price: pricing.priceUSD, currency: Currency.USD };
  }

  private getPlanPricing(plan: Plan, frequency: number, userCurrency?: Currency): { price: number; currency: Currency } {
    const cycle = frequency === Number(Frequency.MONTHLY) ? BillingCycle.MONTHLY : BillingCycle.YEARLY;
    const pricing = plan.price?.[cycle];
    if (!pricing) return { price: 0, currency: Currency.USD };
    if (userCurrency && userCurrency === pricing.originalCurrency) {
      return { price: pricing.originalPrice, currency: pricing.originalCurrency };
    }
    return { price: pricing.priceUSD, currency: Currency.USD };
  }
}

function extractAxiosErrorDetail(error: unknown, fallback: string): string {
  if (error instanceof AxiosError && error.response) {
    const response = error.response as { status: number; data: unknown };
    const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return `Paymob API ${response.status}: ${body}`;
  }
  return error instanceof Error ? error.message : fallback;
}
