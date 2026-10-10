import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, PaginateModel, PaginateOptions } from 'mongoose';
import { Subscription, SubscriptionDocument } from '../entities/subscription.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { QueryService } from 'src/database/query';
import { SubscriptionWebhookDto } from '../dto/subscription-webhook.dto';
import { FEATURE_LIMIT_CONFIG } from '../constants/feature-limit.config';

/** Keys of subscription.usage — use this for incrementUsage/decrementUsage to stay in sync with the entity. */
type UsageFieldKey = keyof Subscription['usage'];

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: PaginateModel<SubscriptionDocument>,
    @InjectModel(Organization.name)
    private readonly organizationModel: mongoose.Model<Organization>,
    private readonly queryService: QueryService
    // private readonly planService: PlanService
  ) {}

  async create(dto: CreateSubscriptionDto, session?: ClientSession): Promise<SubscriptionDocument> {
    const plan = await this.queryService.findOneOrThrow<Plan>(Plan.name, { _id: dto.planId }, 'Plan not found');

    const filter = convertObjectValuesToObjectId({
      organizationId: dto.organizationId,
      planId: dto.planId,
    });

    const existing = await this.subscriptionModel
      .findOne({ ...filter, status: SubscriptionStatus.ACTIVE })
      .session(session ?? null)
      .exec();
    if (existing) {
      throw new BadRequestException('Organization already has an active subscription to a plan.');
    }

    const [subscription] = await this.subscriptionModel.create(
      [
        {
          organizationId: new mongoose.Types.ObjectId(dto.organizationId),
          planId: new mongoose.Types.ObjectId(dto.planId),
          billingCycle: dto.billingCycle,
          startsAt: dto.startsAt,
          endsAt: dto.endsAt ?? null,
          nextBillingAt: dto.nextBillingAt ?? null,
          transactionId: dto.transactionId ?? null,
          billing: dto.billing ?? null,
          reminderDays: dto.reminderDays ?? 7,
          status: SubscriptionStatus.ACTIVE,
          usage: {
            usersUsed: 0,
            coursesUsed: 0,
            pagesUsed: 0,
            parentUsersUsed: 0,
            storageUsedGB: 0,
            liveSessionsUsed: 0,
            assignmentsUsed: 0,
          },
        },
      ],
      session ? { session } : {}
    );

    await this.syncOrganizationSubscription(dto.organizationId, subscription, plan.name, session);
    return subscription;
  }

  async findAll(options: PaginateOptions, filters?: mongoose.RootFilterQuery<Subscription>) {
    const result = await this.subscriptionModel.paginate(filters ?? {}, options);
    return result;
  }

  async findOne(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findById(id).populate('plan').populate('organizationId', 'name slug').exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
    return subscription;
  }

  async findByOrganization(organizationId: string, options: PaginateOptions, filters?: Record<string, unknown>) {
    const baseFilter: mongoose.RootFilterQuery<Subscription> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      ...convertObjectValuesToObjectId(filters ?? {}),
    };
    return this.subscriptionModel.paginate(baseFilter, {
      ...options,
      populate: [{ path: 'plan' }, { path: 'organizationId', select: 'name slug' }],
    });
  }

  async findActiveByOrganization(organizationId: string): Promise<SubscriptionDocument | null> {
    return (
      this.subscriptionModel
        .findOne({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          status: SubscriptionStatus.ACTIVE,
        })
        .populate('plan')
        // eslint-disable-next-line unicorn/no-array-sort
        .sort({ startsAt: -1 })
        .exec()
    );
  }

  async update(id: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }

    const updated = await this.subscriptionModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.endsAt !== undefined && { endsAt: dto.endsAt }),
          ...(dto.nextBillingAt !== undefined && { nextBillingAt: dto.nextBillingAt }),
          ...(dto.transactionId !== undefined && { transactionId: dto.transactionId }),
          ...(dto.billing !== undefined && { billing: dto.billing }),
          ...(dto.cancelledAt !== undefined && { cancelledAt: dto.cancelledAt }),
          ...(dto.suspendedAt !== undefined && { suspendedAt: dto.suspendedAt }),
        },
        { new: true, runValidators: true }
      )
      .populate('plan')
      .exec();

    if (!updated) throw new NotFoundException(`Subscription with id ${id} not found`);
    return updated;
  }

  async cancel(id: string): Promise<SubscriptionDocument> {
    return this.update(id, {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      endsAt: new Date(),
    });
  }

  /**
   * Handle a subscription webhook payload normalized to SubscriptionWebhookDto. Any payment
   * provider must map its webhook to this DTO in processSubscriptionWebhook. Creates, updates,
   * or cancels the subscription based on eventName and DTO fields.
   * @returns The created/updated subscription, or null if the event is not handled.
   */
  async handleProcessedSubscriptionWebhook(dto: SubscriptionWebhookDto): Promise<SubscriptionDocument | null> {
    const { eventName, success, organizationId, planId, externalSubscriptionId, billingCycle, nextBillingAt, endsAt, cancelledAt, billing } = dto;

    switch (eventName) {
      case 'subscription_created': {
        if (!success) return null;
        const existing = await this.subscriptionModel
          .findOne({
            organizationId: new mongoose.Types.ObjectId(organizationId),
            planId: new mongoose.Types.ObjectId(planId),
            status: SubscriptionStatus.ACTIVE,
          })
          .exec();
        if (existing) return existing;

        return this.create({
          organizationId,
          planId,
          billingCycle,
          startsAt: new Date(),
          endsAt: endsAt ?? undefined,
          nextBillingAt: nextBillingAt ?? undefined,
          transactionId: externalSubscriptionId,
          billing: billing ?? undefined,
        });
      }

      case 'subscription_updated': {
        const sub = await this.subscriptionModel.findOne({ transactionId: externalSubscriptionId }).exec();
        if (!sub) return null;
        return this.expireCurrentAndCreateNewPeriod(sub, {
          organizationId,
          planId,
          billingCycle,
          nextBillingAt: nextBillingAt ?? undefined,
          endsAt: endsAt ?? undefined,
          billing: billing ?? undefined,
        });
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        const sub = await this.subscriptionModel.findOne({ transactionId: externalSubscriptionId }).exec();
        if (!sub) return null;
        const newStatus = eventName === 'subscription_expired' ? SubscriptionStatus.EXPIRED : SubscriptionStatus.CANCELLED;
        return this.update(sub._id.toString(), {
          status: newStatus,
          endsAt: endsAt ?? new Date(),
          cancelledAt: eventName === 'subscription_cancelled' ? (cancelledAt ?? new Date()) : undefined,
        });
      }

      case 'subscription_resumed':
      case 'subscription_unpaused': {
        const sub = await this.subscriptionModel.findOne({ transactionId: externalSubscriptionId }).exec();
        if (!sub) return null;
        return this.update(sub._id.toString(), {
          status: SubscriptionStatus.ACTIVE,
          nextBillingAt: nextBillingAt ?? undefined,
        });
      }

      case 'subscription_payment_success':
      case 'subscription_payment_recovered': {
        const sub = await this.subscriptionModel.findOne({ transactionId: externalSubscriptionId }).exec();
        if (!sub) return null;
        return this.expireCurrentAndCreateNewPeriod(sub, {
          nextBillingAt: nextBillingAt ?? undefined,
        });
      }

      default: {
        return null;
      }
    }
  }

  /**
   * Starts a new subscription period by expiring the current one and creating a new active subscription.
   * Per-period usage (users, courses, pages, parent accounts, live sessions, assignments) is reset to 0;
   * storage is carried over.
   * Used for subscription_updated, subscription_payment_success, and subscription_payment_recovered.
   */
  async expireCurrentAndCreateNewPeriod(
    current: SubscriptionDocument,
    dto: {
      organizationId?: string;
      planId?: string;
      billingCycle?: (typeof current)['billingCycle'];
      nextBillingAt?: Date | null;
      endsAt?: Date | null;
      billing?: SubscriptionDocument['billing'];
    },
    session?: ClientSession
  ): Promise<SubscriptionDocument> {
    const organizationId = dto.organizationId ?? current.organizationId.toString();
    const planId = dto.planId ?? current.planId.toString();
    const billingCycle = dto.billingCycle ?? current.billingCycle;
    const startsAt = new Date();
    const endsAt = dto.endsAt ?? current.endsAt ?? null;
    const nextBillingAt = dto.nextBillingAt ?? current.nextBillingAt ?? null;
    const transactionId = current.transactionId;
    const billing = dto.billing ?? current.billing ?? null;
    const reminderDays = current.reminderDays ?? 7;

    const storageUsedGB = current.usage?.storageUsedGB ?? 0;

    await this.subscriptionModel.updateOne(
      { _id: current._id },
      {
        $set: {
          status: SubscriptionStatus.EXPIRED,
          endsAt: new Date(),
        },
      },
      { session: session ?? undefined }
    );

    const [newSubscription] = await this.subscriptionModel.create(
      [
        {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          planId: new mongoose.Types.ObjectId(planId),
          billingCycle,
          startsAt,
          endsAt,
          nextBillingAt,
          transactionId,
          billing,
          reminderDays,
          status: SubscriptionStatus.ACTIVE,
          usage: {
            usersUsed: 0,
            coursesUsed: 0,
            pagesUsed: 0,
            parentUsersUsed: 0,
            storageUsedGB,
            liveSessionsUsed: 0,
            assignmentsUsed: 0,
          },
        },
      ],
      session ? { session } : {}
    );

    const plan = await this.queryService.findOneOrThrow<Plan>(Plan.name, { _id: newSubscription.planId }, 'Plan not found');
    await this.syncOrganizationSubscription(organizationId, newSubscription, plan.name, session);

    const doc = await this.subscriptionModel
      .findById(newSubscription._id)
      .populate('plan')
      .session(session ?? null)
      .exec();
    if (!doc) throw new NotFoundException('New subscription not found after create');
    return doc;
  }

  async incrementUsage(organizationId: string, field: UsageFieldKey, amount = 1, session?: ClientSession): Promise<void> {
    await this.subscriptionModel.updateOne(
      { organizationId: new mongoose.Types.ObjectId(organizationId), status: SubscriptionStatus.ACTIVE },
      { $inc: { [`usage.${field}`]: amount } },
      { session: session ?? undefined }
    );
  }

  async decrementUsage(organizationId: string, field: UsageFieldKey, amount = 1, session?: ClientSession): Promise<void> {
    await this.subscriptionModel.updateOne(
      {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: SubscriptionStatus.ACTIVE,
        [`usage.${field}`]: { $gte: amount },
      },
      { $inc: { [`usage.${field}`]: -amount } },
      { session: session ?? undefined }
    );
  }

  async assertWithinLimit(organizationId: string, feature: keyof typeof FEATURE_LIMIT_CONFIG, incrementBy = 1): Promise<void> {
    const subscription = await this.findActiveByOrganization(organizationId);
    if (!subscription) {
      throw new ForbiddenException('No active subscription found for this organization.');
    }

    const config = FEATURE_LIMIT_CONFIG[feature];
    if (config?.type !== 'numeric' || !config.usageField) {
      throw new BadRequestException(`Feature "${feature}" is not configured as a numeric subscription limit.`);
    }

    const plan = (subscription as unknown as { plan: Plan }).plan;

    if (!plan) {
      throw new ForbiddenException('Subscription plan could not be resolved.');
    }

    const featureValue = (plan.features as Record<string, unknown>)[feature];
    const limit = typeof featureValue === 'number' ? featureValue : 0;
    if (limit < 0) return;

    const current = (subscription.usage as Record<string, number>)[config.usageField] ?? 0;
    if (current + incrementBy > limit) {
      throw new ForbiddenException(`Plan limit reached for ${feature} (${current}/${limit}). Please upgrade your plan.`);
    }
  }

  private async syncOrganizationSubscription(
    organizationId: string,
    subscription: SubscriptionDocument,
    planName: string,
    session?: ClientSession
  ): Promise<void> {
    await this.organizationModel
      .findByIdAndUpdate(organizationId, { $set: { planName, subscriptionId: subscription._id } }, { session: session ?? undefined })
      .exec();
  }
}
