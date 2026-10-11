import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { PaginateModel, PaginateOptions, Types } from 'mongoose';
import { AiSubscription, AiSubscriptionDocument } from '../entities/ai-subscription.entity';
import { AiPlan, AiPlanDocument } from '../../ai-plan/entities/ai-plan.entity';
import { AiPlanTier } from '@darnozom/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';

/** Returns a UTC date string (YYYY-MM-DD) for the given date, used to compare calendar days. */
function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return toUtcDateString(a) === toUtcDateString(b);
}

@Injectable()
export class AiSubscriptionService {
  private readonly logger = new Logger(AiSubscriptionService.name);

  constructor(
    @InjectModel(AiSubscription.name)
    private readonly aiSubscriptionModel: PaginateModel<AiSubscriptionDocument>,
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: mongoose.Model<AiPlanDocument>
  ) {}

  async findActiveByUser(userId: string): Promise<AiSubscriptionDocument | null> {
    return (
      this.aiSubscriptionModel
        .findOne({
          userId: new Types.ObjectId(userId),
          subscriberType: 'user',
          status: SubscriptionStatus.ACTIVE,
        })
        .populate('aiPlanId')
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ startsAt: -1 })
        .exec()
    );
  }

  /**
   * Assigns the FREE AiPlan to a newly created user. Called from the event listener.
   * Idempotent: skips if the user already has an active AI subscription.
   */
  async assignFreePlan(userId: string): Promise<void> {
    const existing = await this.aiSubscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), subscriberType: 'user', status: SubscriptionStatus.ACTIVE })
      .lean()
      .exec();

    if (existing) return;

    const freePlan = await this.aiPlanModel.findOne({ tier: AiPlanTier.FREE }).lean().exec();
    if (!freePlan) {
      this.logger.warn(`FREE AiPlan not found — cannot assign to user ${userId}`);
      return;
    }

    await this.aiSubscriptionModel.create({
      userId: new Types.ObjectId(userId),
      subscriberType: 'user',
      aiPlanId: freePlan._id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      startsAt: new Date(),
      endsAt: null,
      nextBillingAt: null,
      cancelledAt: null,
      transactionId: null,
      billing: null,
      usage: {
        dailyMessagesUsed: 0,
        lastDailyReset: new Date(),
      },
    });
  }

  async create(data: Partial<AiSubscription>): Promise<AiSubscriptionDocument> {
    const [subscription] = await this.aiSubscriptionModel.create([data]);
    return subscription;
  }

  async findAll(
    options: PaginateOptions,
    filters?: {
      aiPlanId?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
    }
  ) {
    const query: mongoose.RootFilterQuery<AiSubscription> = {};

    if (filters?.aiPlanId) {
      query.aiPlanId = new Types.ObjectId(filters.aiPlanId);
    }

    if (filters?.createdAtFrom || filters?.createdAtTo) {
      query.createdAt = {};
      if (filters?.createdAtFrom) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filters.createdAtFrom);
      }
      if (filters?.createdAtTo) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filters.createdAtTo);
      }
    }

    return this.aiSubscriptionModel.paginate(query, {
      ...options,
      populate: [
        { path: 'aiPlanId', select: 'name tier' },
        { path: 'userId', select: 'firstName lastName email' },
      ],
    });
  }

  async findOne(id: string): Promise<AiSubscriptionDocument> {
    const sub = await this.aiSubscriptionModel.findById(id).populate('aiPlanId').populate('userId', 'firstName lastName email').exec();
    if (!sub) throw new NotFoundException(`AiSubscription with id ${id} not found`);
    return sub;
  }

  async cancel(id: string): Promise<AiSubscriptionDocument> {
    const sub = await this.aiSubscriptionModel.findById(id).exec();
    if (!sub) throw new NotFoundException(`AiSubscription with id ${id} not found`);
    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }
    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    return sub.save();
  }

  async update(id: string, data: Partial<AiSubscription>): Promise<AiSubscriptionDocument> {
    const updated = await this.aiSubscriptionModel.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
    if (!updated) throw new NotFoundException(`AiSubscription with id ${id} not found`);
    return updated;
  }

  /**
   * Called from the webhook handler when a Lemon Squeezy or Paymob AI subscription event arrives.
   * Creates or updates the AI subscription for the target user.
   * When `childUserId` is in metadata, the subscription is assigned to the child; otherwise to `userId`.
   */
  async handleAiSubscriptionWebhook(payload: {
    success: boolean;
    status: SubscriptionStatus;
    userId: string;
    aiPlanId: string;
    billingCycle: BillingCycle;
    transactionId?: string;
    nextBillingAt?: Date | null;
    endsAt?: Date | null;
    childUserId?: string;
    billing?: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      amount: number;
      currency: string;
    } | null;
  }): Promise<AiSubscriptionDocument | null> {
    if (!payload.success) return null;

    const targetUserId = payload.childUserId ?? payload.userId;

    // Cancel any previous active subscription for the target user so they only have one active at a time
    await this.aiSubscriptionModel.updateMany(
      { userId: new Types.ObjectId(targetUserId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() } }
    );

    const now = new Date();
    const sub = await this.aiSubscriptionModel.create({
      userId: new Types.ObjectId(targetUserId),
      subscriberType: 'user',
      aiPlanId: new Types.ObjectId(payload.aiPlanId),
      status: payload.status,
      billingCycle: payload.billingCycle,
      startsAt: now,
      endsAt: payload.endsAt ?? null,
      nextBillingAt: payload.nextBillingAt ?? null,
      cancelledAt: null,
      transactionId: payload.transactionId ?? null,
      billing: payload.billing ?? null,
      usage: { dailyMessagesUsed: 0, lastDailyReset: now },
    });

    return sub;
  }

  /**
   * Increments dailyMessagesUsed for the user's active subscription.
   * Auto-resets the counter if lastDailyReset is from a previous UTC day.
   */
  async incrementDailyUsage(userId: string): Promise<void> {
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    await this.aiSubscriptionModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        subscriberType: 'user',
        status: SubscriptionStatus.ACTIVE,
        'usage.lastDailyReset': { $lt: startOfToday },
      },
      {
        $set: {
          'usage.dailyMessagesUsed': 0,
          'usage.lastDailyReset': startOfToday,
        },
      }
    );

    await this.aiSubscriptionModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        subscriberType: 'user',
        status: SubscriptionStatus.ACTIVE,
      },
      { $inc: { 'usage.dailyMessagesUsed': 1 } }
    );
  }

  /**
   * Resets daily usage counter if the lastDailyReset is from a previous UTC day.
   * Called by the guard before checking limits. Returns the updated subscription.
   */
  async resetDailyUsageIfNeeded(userId: string): Promise<AiSubscriptionDocument | null> {
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    await this.aiSubscriptionModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        subscriberType: 'user',
        status: SubscriptionStatus.ACTIVE,
        'usage.lastDailyReset': { $lt: startOfToday },
      },
      {
        $set: {
          'usage.dailyMessagesUsed': 0,
          'usage.lastDailyReset': startOfToday,
        },
      }
    );

    return this.findActiveByUser(userId);
  }
}
