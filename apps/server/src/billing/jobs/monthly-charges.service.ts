import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, GroupStatus, GroupStudentStatus, SubscriptionType } from '@darnozom/shared-types';
import { Cohort } from 'src/academics/cohort/entities/cohort.entity';
import { Group } from 'src/academics/group/entities/group.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { LedgerService } from '../ledger/ledger.service';
import { monthlyChargeDueDates, monthlyIdempotencyKey } from '../domain/charge-schedule';

interface GroupForMonthlyBilling {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  cohortId: Types.ObjectId;
  status: GroupStatus;
  timezone: string;
  students: {
    studentId: Types.ObjectId;
    status?: GroupStudentStatus;
  }[];
}

interface CohortForMonthlyBilling {
  _id: Types.ObjectId;
  startDate: Date;
}

interface BillingSubscriptionLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  familyId: Types.ObjectId;
  currency: Currency;
  type: SubscriptionType;
  status: BillingSubscriptionStatus;
  amountMinor: number;
  items: {
    studentId: Types.ObjectId;
    groupId: Types.ObjectId;
  }[];
}

@Injectable()
export class MonthlyChargesService {
  private readonly logger = new Logger(MonthlyChargesService.name);

  constructor(
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Posts one charge per month due since cohort start for active monthly subscriptions on running groups.
   *
   * Skips groups not in RUNNING status and students who have WITHDRAWN.
   * Relies on the ledger's idempotency key deduplication to make runs idempotent.
   */
  async run(now = new Date()): Promise<number> {
    const subscriptions = await this.subscriptionModel
      .find({
        status: BillingSubscriptionStatus.ACTIVE,
        type: SubscriptionType.MONTHLY,
      })
      .lean<BillingSubscriptionLean[]>()
      .exec();

    let posted = 0;
    for (const subscription of subscriptions) {
      if (
        subscription.status !== BillingSubscriptionStatus.ACTIVE ||
        subscription.type !== SubscriptionType.MONTHLY ||
        subscription.amountMinor <= 0 ||
        subscription.items.length === 0
      ) {
        continue;
      }

      try {
        for (const item of subscription.items) {
          const group = await this.groupModel.findOne({ _id: item.groupId }).lean<GroupForMonthlyBilling | null>().exec();
          if (!group || group.status !== GroupStatus.RUNNING) continue;

          const studentInGroup = group.students.find((s) => String(s.studentId) === String(item.studentId));
          if (!studentInGroup || studentInGroup.status === GroupStudentStatus.WITHDRAWN) {
            continue;
          }

          const cohort = await this.cohortModel.findOne({ _id: group.cohortId }).lean<CohortForMonthlyBilling | null>().exec();
          if (!cohort?.startDate) continue;

          const dueDates = monthlyChargeDueDates(cohort.startDate, group.timezone, now);
          if (dueDates.length === 0) continue;

          const written = await this.ledger.postCharges({
            organizationId: String(subscription.organizationId),
            familyId: String(subscription.familyId),
            currency: subscription.currency,
            subscriptionId: String(subscription._id),
            charges: dueDates.map((dueAt) => ({
              amountMinor: subscription.amountMinor,
              dueAt,
              studentId: String(item.studentId),
              groupId: String(item.groupId),
              idempotencyKey: monthlyIdempotencyKey(String(subscription._id), dueAt),
              descriptionKey: 'billing.charge.monthly',
            })),
          });
          posted += written.length;
        }
      } catch (error) {
        this.logger.error(`Monthly charge failed for subscription ${subscription._id}: ${(error as Error).message}`);
      }
    }

    return posted;
  }
}
