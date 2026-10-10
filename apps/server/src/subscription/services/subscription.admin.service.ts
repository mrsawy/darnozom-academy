import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, PaginateModel } from 'mongoose';
import { AdminReviewErrors } from '@lms-organization/shared-types';
import { Subscription, SubscriptionDocument } from '../entities/subscription.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { QueryService } from 'src/database/query';
import { SubscriptionService } from './subscription.service';

/**
 * Platform-admin subscription overrides (DB-only; no payment-provider sync).
 * Colocated as `<feature>.admin.service.ts` — see skill `admin-service-colocation`.
 */
@Injectable()
export class SubscriptionAdminService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: PaginateModel<SubscriptionDocument>,
    @InjectModel(Organization.name)
    private readonly organizationModel: mongoose.Model<Organization>,
    private readonly queryService: QueryService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  /**
   * Platform-admin DB override: assign a plan without payment-provider sync.
   * Expires any ACTIVE subscription and creates a new ACTIVE period, carrying over
   * all usage counters so existing resources remain and limit guards stay accurate.
   */
  async assignPlan(
    organizationId: string,
    planId: string,
    billingCycle: BillingCycle,
    endsAt?: Date | null,
    session?: ClientSession
  ): Promise<SubscriptionDocument> {
    const plan = await this.queryService.findOneOrThrow<Plan>(Plan.name, { _id: planId }, AdminReviewErrors.PLAN_NOT_FOUND);
    if (!plan.isActive) {
      throw new BadRequestException(AdminReviewErrors.PLAN_NOT_ACTIVE);
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const currentActive = await this.subscriptionModel
      .findOne({ organizationId: orgObjectId, status: SubscriptionStatus.ACTIVE })
      .session(session ?? null)
      .exec();

    const previous =
      currentActive ??
      (await this.subscriptionModel
        .findOne({ organizationId: orgObjectId })
        // eslint-disable-next-line unicorn/no-array-sort
        .sort({ startsAt: -1 })
        .session(session ?? null)
        .exec());

    if (currentActive) {
      await this.subscriptionModel.updateOne(
        { _id: currentActive._id },
        {
          $set: {
            status: SubscriptionStatus.EXPIRED,
            endsAt: new Date(),
          },
        },
        { session: session ?? undefined }
      );
    }

    const usage = previous?.usage
      ? {
          usersUsed: previous.usage.usersUsed ?? 0,
          coursesUsed: previous.usage.coursesUsed ?? 0,
          pagesUsed: previous.usage.pagesUsed ?? 0,
          parentUsersUsed: previous.usage.parentUsersUsed ?? 0,
          storageUsedGB: previous.usage.storageUsedGB ?? 0,
          liveSessionsUsed: previous.usage.liveSessionsUsed ?? 0,
          assignmentsUsed: previous.usage.assignmentsUsed ?? 0,
        }
      : {
          usersUsed: 0,
          coursesUsed: 0,
          pagesUsed: 0,
          parentUsersUsed: 0,
          storageUsedGB: 0,
          liveSessionsUsed: 0,
          assignmentsUsed: 0,
        };

    const startsAt = new Date();
    const resolvedEndsAt = endsAt === undefined ? (previous?.endsAt ?? null) : endsAt;

    const [newSubscription] = await this.subscriptionModel.create(
      [
        {
          organizationId: orgObjectId,
          planId: new mongoose.Types.ObjectId(planId),
          billingCycle,
          startsAt,
          endsAt: resolvedEndsAt,
          nextBillingAt: previous?.nextBillingAt ?? null,
          transactionId: null,
          billing: null,
          reminderDays: previous?.reminderDays ?? 7,
          status: SubscriptionStatus.ACTIVE,
          usage,
        },
      ],
      session ? { session } : {}
    );

    await this.syncOrganizationSubscription(organizationId, newSubscription, plan.name, session);

    const doc = await this.subscriptionModel
      .findById(newSubscription._id)
      .populate('plan')
      .session(session ?? null)
      .exec();
    if (!doc) throw new NotFoundException(AdminReviewErrors.SUBSCRIPTION_NOT_FOUND);
    return doc;
  }

  /** Prefer ACTIVE subscription; otherwise the org's linked subscriptionId document. */
  async findCurrentForOrganization(organizationId: string): Promise<SubscriptionDocument | null> {
    const active = await this.subscriptionService.findActiveByOrganization(organizationId);
    if (active) return active;

    const org = await this.organizationModel.findById(organizationId).select('subscriptionId').lean().exec();
    if (!org?.subscriptionId) return null;
    return this.subscriptionModel.findById(org.subscriptionId).populate('plan').exec();
  }

  async findStatusesByIds(ids: string[]): Promise<Map<string, SubscriptionStatus>> {
    const map = new Map<string, SubscriptionStatus>();
    if (ids.length === 0) return map;
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length === 0) return map;
    const docs = await this.subscriptionModel
      .find({ _id: { $in: objectIds } })
      .select('_id status')
      .lean()
      .exec();
    for (const doc of docs) {
      map.set(String(doc._id), doc.status);
    }
    return map;
  }

  async updatePeriod(
    subscriptionId: string,
    dto: { billingCycle?: BillingCycle; endsAt?: Date | null; nextBillingAt?: Date | null },
    startsAt: Date
  ): Promise<SubscriptionDocument> {
    if (dto.endsAt != null && new Date(dto.endsAt).getTime() < new Date(startsAt).getTime()) {
      throw new BadRequestException(AdminReviewErrors.INVALID_SUBSCRIPTION_PERIOD);
    }

    const updated = await this.subscriptionModel
      .findByIdAndUpdate(
        subscriptionId,
        {
          ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
          ...(dto.endsAt !== undefined && { endsAt: dto.endsAt }),
          ...(dto.nextBillingAt !== undefined && { nextBillingAt: dto.nextBillingAt }),
        },
        { new: true, runValidators: true }
      )
      .populate('plan')
      .exec();

    if (!updated) throw new NotFoundException(AdminReviewErrors.SUBSCRIPTION_NOT_FOUND);
    return updated;
  }

  async suspend(id: string): Promise<SubscriptionDocument> {
    return this.subscriptionService.update(id, {
      status: SubscriptionStatus.SUSPENDED,
      suspendedAt: new Date(),
    });
  }

  async cancel(id: string): Promise<SubscriptionDocument> {
    return this.subscriptionService.cancel(id);
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
