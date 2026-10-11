import { Model, Types } from 'mongoose';
import { AiSubscription } from '../entities/ai-subscription.entity';
import { AiPlan } from '../../ai-plan/entities/ai-plan.entity';
import { AiPlanTier } from '@darnozom/shared-types';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';
import { SubscriptionStatus } from '../../utils/enums/subscriptionStatus.enum';

export class AiSubscriptionSeeder {
  private freePlan: (AiPlan & { _id: Types.ObjectId }) | null = null;
  private proPlan: (AiPlan & { _id: Types.ObjectId }) | null = null;

  constructor(
    private readonly aiSubscriptionModel: Model<AiSubscription>,
    private readonly aiPlanModel: Model<AiPlan>
  ) {}

  async loadPlans() {
    this.freePlan = (await this.aiPlanModel.findOne({ tier: AiPlanTier.FREE }).lean()) as (AiPlan & { _id: Types.ObjectId }) | null;
    this.proPlan = (await this.aiPlanModel.findOne({ tier: AiPlanTier.PRO }).lean()) as (AiPlan & { _id: Types.ObjectId }) | null;
    if (!this.freePlan) throw new Error('AI Free plan not found. Ensure AiPlanSeeder ran first.');
  }

  /** Seed one AI subscription per user; ~20% get Pro (every 5th by index). */
  async seedForUsers(userIds: Types.ObjectId[]) {
    if (userIds.length === 0) return;
    const docs = userIds.map((userId, idx) => {
      const isPro = this.proPlan && idx % 5 === 0;
      const plan = isPro ? this.proPlan! : this.freePlan!;
      return {
        userId,
        subscriberType: 'user' as const,
        aiPlanId: plan._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: isPro ? BillingCycle.MONTHLY : BillingCycle.ONE_TIME,
        startsAt: new Date(),
        endsAt: null,
        nextBillingAt: isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        cancelledAt: null,
        transactionId: null,
        billing: null,
        usage: { dailyMessagesUsed: 0, lastDailyReset: new Date() },
      };
    });
    await this.aiSubscriptionModel.insertMany(docs);
  }

  /**
   * Seed a unique AI subscription scenario per super-admin, cycling through
   * five representative states (free/pro × billing cycles × usage levels).
   */
  async seedForSuperAdmin(userId: Types.ObjectId, orgIndex: number) {
    const proPlanDoc = this.proPlan ?? this.freePlan!;
    const defs = [
      {
        plan: this.freePlan!,
        billingCycle: BillingCycle.ONE_TIME,
        nextBillingAt: null as Date | null,
        dailyMessagesUsed: 0,
      },
      {
        plan: proPlanDoc,
        billingCycle: BillingCycle.MONTHLY,
        nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        dailyMessagesUsed: 0,
      },
      {
        plan: this.freePlan!,
        billingCycle: BillingCycle.ONE_TIME,
        nextBillingAt: null as Date | null,
        dailyMessagesUsed: 12,
      },
      {
        plan: proPlanDoc,
        billingCycle: BillingCycle.YEARLY,
        nextBillingAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        dailyMessagesUsed: 120,
      },
      {
        plan: this.freePlan!,
        billingCycle: BillingCycle.ONE_TIME,
        nextBillingAt: null as Date | null,
        dailyMessagesUsed: 20,
      },
    ];
    const d = defs[orgIndex % defs.length];
    const now = new Date();
    await this.aiSubscriptionModel.create({
      userId,
      subscriberType: 'user',
      aiPlanId: d.plan._id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: d.billingCycle,
      startsAt: now,
      endsAt: null,
      nextBillingAt: d.nextBillingAt,
      cancelledAt: null,
      transactionId: null,
      billing: null,
      usage: { dailyMessagesUsed: d.dailyMessagesUsed, lastDailyReset: now },
    });
  }
}
