import { Model } from 'mongoose';
import { Plan } from '../entities/plan.entity';
import { PlanTier } from '../enum/planTier.enum';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';
import { Currency } from '@lms-organization/shared-types';
import { CurrencyService } from '../../currency/currency.service';

/** Read Paddle price IDs from env, e.g. PADDLE_PRICE_BASIC_MONTHLY=pri_xxx */
function paddlePriceIds(tier: PlanTier): { MONTHLY?: string; YEARLY?: string } | undefined {
  const prefix = `PADDLE_PRICE_${tier}_`;
  const monthly = process.env[`${prefix}MONTHLY`];
  const yearly = process.env[`${prefix}YEARLY`];
  if (monthly || yearly) return { MONTHLY: monthly, YEARLY: yearly };
  return undefined;
}

export class PlanSeeder {
  constructor(
    private readonly planModel: Model<Plan>,
    private readonly currencyService: CurrencyService
  ) {}

  private planPrice(originalPrice: number, originalCurrency: Currency = Currency.USD) {
    const priceUSD = this.currencyService.convertToUSD(originalPrice, originalCurrency);
    return {
      originalPrice,
      originalCurrency,
      priceUSD,
    };
  }

  async seed() {
    await this.currencyService.updateExchangeRates();

    const plans = [
      {
        name: 'Free Plan',
        description: 'Perfect for starters',
        price: {
          [BillingCycle.MONTHLY]: this.planPrice(0),
          [BillingCycle.YEARLY]: this.planPrice(0),
          [BillingCycle.ONE_TIME]: this.planPrice(0),
        },
        tier: PlanTier.FREE,
        taxPercentage: 15,
        features: {
          usersPerSubscription: 10,
          coursesPerSubscription: 2,
          parentAccountsPerSubscription: 2,
          pagesPerSubscription: 1,
          liveSessionsPerMonth: 10,
          assignmentsPerMonth: 10,
          maxStorageGB: 1,
          courseAnalytics: false,
          contentAnalytics: false,
          moduleAnalytics: false,
          trackingStudentProgress: false,
          prioritySupport: false,
          accessStudentsInfo: false,
          certificates: false,
          discussions: false,
          customBranding: false,
          inAppChat: false,
          liveSessions: false,
          quizzes: false,
          assignments: false,
          bulkExport: false,
          apiAccess: false,
          whiteLabel: false,
          customDomain: false,
          sso: false,
          attendanceTracking: false,
          dripContent: false,
          gamification: false,
          webhooks: false,
          reporting: false,
          courseTemplates: false,
          multiLanguage: false,
          studentProgressTracking: false,
        },
        isActive: true,
      },
      {
        name: 'Basic Plan',
        description: 'For small teams',
        price: {
          [BillingCycle.MONTHLY]: this.planPrice(500, Currency.EGP),
          [BillingCycle.YEARLY]: this.planPrice(4000, Currency.EGP),
          [BillingCycle.ONE_TIME]: this.planPrice(5000, Currency.EGP),
        },
        tier: PlanTier.BASIC,
        taxPercentage: 10,
        paddlePriceIds: paddlePriceIds(PlanTier.BASIC),
        features: {
          usersPerSubscription: 100,
          coursesPerSubscription: 10,
          parentAccountsPerSubscription: 50,
          pagesPerSubscription: 10,
          liveSessionsPerMonth: 100,
          assignmentsPerMonth: 300,
          maxStorageGB: 10,
          courseAnalytics: true,
          contentAnalytics: true,
          moduleAnalytics: true,
          trackingStudentProgress: true,
          prioritySupport: false,
          accessStudentsInfo: true,
          certificates: true,
          discussions: true,
          customBranding: true,
          inAppChat: true,
          liveSessions: true,
          quizzes: true,
          assignments: true,
          bulkExport: true,
          apiAccess: true,
          whiteLabel: true,
          customDomain: true,
          sso: true,
          attendanceTracking: true,
          dripContent: true,
          gamification: true,
          webhooks: true,
          reporting: true,
          courseTemplates: true,
          multiLanguage: true,
          studentProgressTracking: true,
        },
        isActive: true,
        lemonSqueezyVariantIds: {
          MONTHLY: process.env.BASIC_LEMON_SQUEEZY_PLAN_ID_MONTHLY,
          YEARLY: process.env.BASIC_LEMON_SQUEEZY_PLAN_ID_YEARLY,
        },
      },
      {
        name: 'Pro Plan',
        description: 'For growing organizations',
        price: {
          [BillingCycle.MONTHLY]: this.planPrice(1000, Currency.EGP),
          [BillingCycle.YEARLY]: this.planPrice(8000, Currency.EGP),
          [BillingCycle.ONE_TIME]: this.planPrice(10_000, Currency.EGP),
        },
        tier: PlanTier.PRO,
        taxPercentage: 7,
        paddlePriceIds: paddlePriceIds(PlanTier.PRO),
        features: {
          usersPerSubscription: 500,
          coursesPerSubscription: 50,
          parentAccountsPerSubscription: 500,
          pagesPerSubscription: 100,
          liveSessionsPerMonth: 100,
          assignmentsPerMonth: 300,
          maxStorageGB: 50,
          courseAnalytics: true,
          contentAnalytics: true,
          moduleAnalytics: true,
          trackingStudentProgress: true,
          prioritySupport: true,
          accessStudentsInfo: true,
          certificates: true,
          discussions: true,
          customBranding: true,
          inAppChat: true,
          liveSessions: true,
          quizzes: true,
          assignments: true,
          bulkExport: true,
          apiAccess: true,
          whiteLabel: true,
          customDomain: true,
          sso: true,
          attendanceTracking: true,
          dripContent: true,
          gamification: true,
          webhooks: true,
          reporting: true,
          courseTemplates: true,
          multiLanguage: true,
          studentProgressTracking: true,
        },
        isActive: true,
      },
      {
        name: 'Enterprise Plan',
        description: 'Unlimited power',
        price: {
          [BillingCycle.MONTHLY]: this.planPrice(2000, Currency.EGP),
          [BillingCycle.YEARLY]: this.planPrice(16_000, Currency.EGP),
          [BillingCycle.ONE_TIME]: this.planPrice(20_000, Currency.EGP),
        },
        tier: PlanTier.ENTERPRISE,
        taxPercentage: 5,
        paddlePriceIds: paddlePriceIds(PlanTier.ENTERPRISE),
        features: {
          usersPerSubscription: -1,
          coursesPerSubscription: -1,
          parentAccountsPerSubscription: -1,
          pagesPerSubscription: -1,
          liveSessionsPerMonth: -1,
          assignmentsPerMonth: -1,
          maxStorageGB: 500,
          courseAnalytics: true,
          contentAnalytics: true,
          moduleAnalytics: true,
          trackingStudentProgress: true,
          prioritySupport: true,
          accessStudentsInfo: true,
          certificates: true,
          discussions: true,
          customBranding: true,
          inAppChat: true,
          liveSessions: true,
          quizzes: true,
          assignments: true,
          bulkExport: true,
          apiAccess: true,
          whiteLabel: true,
          customDomain: true,
          sso: true,
          attendanceTracking: true,
          dripContent: true,
          gamification: true,
          webhooks: true,
          reporting: true,
          courseTemplates: true,
          multiLanguage: true,
          studentProgressTracking: true,
        },
        isActive: true,
      },
    ];

    for (const plan of plans) {
      await this.planModel.findOneAndUpdate({ tier: plan.tier }, plan, {
        upsert: true,
        new: true,
      });
    }
  }
}
