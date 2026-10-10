import { Model } from 'mongoose';
import { AiPlan } from '../entities/ai-plan.entity';
import { AiPlanTier, BillingCycle, Currency } from '@lms-organization/shared-types';

export class AiPlanSeeder {
  constructor(private readonly aiPlanModel: Model<AiPlan>) {}

  async seed() {
    const zeroPricing = {
      [BillingCycle.MONTHLY]: { originalPrice: 0, originalCurrency: Currency.USD, priceUSD: 0 },
      [BillingCycle.YEARLY]: { originalPrice: 0, originalCurrency: Currency.USD, priceUSD: 0 },
      [BillingCycle.ONE_TIME]: { originalPrice: 0, originalCurrency: Currency.USD, priceUSD: 0 },
    };

    const plans = [
      {
        name: 'AI Free Plan',
        description: 'Get started with 20 AI messages per day at no cost.',
        tier: AiPlanTier.FREE,
        features: {
          messagesPerDay: 20,
          aiAssistant: true,
        },
        price: zeroPricing,
        isActive: true,
      },
      {
        name: 'AI Pro Plan',
        description: 'Unlimited AI messages for power learners.',
        tier: AiPlanTier.PRO,
        features: {
          messagesPerDay: -1,
          aiAssistant: true,
        },
        price: {
          [BillingCycle.MONTHLY]: { originalPrice: 500, originalCurrency: Currency.EGP, priceUSD: 20 },
          [BillingCycle.YEARLY]: { originalPrice: 5000, originalCurrency: Currency.EGP, priceUSD: 200 },
          // [BillingCycle.ONE_TIME]: { originalPrice: 5000, originalCurrency: Currency.EGP, priceUSD: 200 },
        },
        isActive: true,
      },
    ];

    for (const plan of plans) {
      await this.aiPlanModel.findOneAndUpdate({ tier: plan.tier }, plan, {
        upsert: true,
        new: true,
      });
    }
  }
}
