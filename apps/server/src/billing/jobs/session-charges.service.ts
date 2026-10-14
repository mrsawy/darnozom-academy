import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, GroupStudentStatus, SessionStatus, SubscriptionType } from '@darnozom/shared-types';
import { Group } from 'src/academics/group/entities/group.entity';
import { Session } from 'src/academics/session/entities/session.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { LedgerService } from '../ledger/ledger.service';
import { perSessionIdempotencyKey } from '../domain/charge-schedule';

interface SessionForBilling {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  groupId: Types.ObjectId;
  status: SessionStatus;
}

interface GroupForBilling {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  students: {
    studentId: Types.ObjectId;
    status?: GroupStudentStatus;
  }[];
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

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class SessionChargesService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Posts one charge per per-session subscription in the group.
   *
   * Every student on the roster is billed, present or absent: the seat was reserved and the teacher
   * is paid for a session that was held (spec decision D1). A withdrawn student is not on the
   * roster any more, so they are not billed (plan decision D6).
   */
  async onSessionCompleted(sessionId: string): Promise<number> {
    const session = await this.sessionModel
      .findOne({ _id: oid(sessionId) })
      .lean<SessionForBilling | null>()
      .exec();
    if (!session || session.status !== SessionStatus.COMPLETED) return 0;

    const group = await this.groupModel.findOne({ _id: session.groupId }).lean<GroupForBilling | null>().exec();
    if (!group) return 0;

    const activeStudentIds = new Set(
      group.students.filter((student) => student.status !== GroupStudentStatus.WITHDRAWN).map((student) => String(student.studentId))
    );

    const subscriptions = await this.subscriptionModel
      .find({
        status: BillingSubscriptionStatus.ACTIVE,
        type: SubscriptionType.PER_SESSION,
        'items.groupId': session.groupId,
      })
      .lean<BillingSubscriptionLean[]>()
      .exec();

    let posted = 0;
    const now = new Date();
    for (const subscription of subscriptions) {
      if (
        subscription.status !== BillingSubscriptionStatus.ACTIVE ||
        subscription.type !== SubscriptionType.PER_SESSION ||
        subscription.amountMinor <= 0
      ) {
        continue;
      }
      for (const item of subscription.items) {
        if (String(item.groupId) !== String(session.groupId)) continue;
        if (!activeStudentIds.has(String(item.studentId))) continue;

        const written = await this.ledger.postCharges({
          organizationId: String(session.organizationId),
          familyId: String(subscription.familyId),
          currency: subscription.currency,
          subscriptionId: String(subscription._id),
          sessionId: String(session._id),
          charges: [
            {
              amountMinor: subscription.amountMinor,
              dueAt: now,
              studentId: String(item.studentId),
              groupId: String(item.groupId),
              // Keyed per student per session, so a retried completion posts nothing twice.
              idempotencyKey: perSessionIdempotencyKey(String(subscription._id), String(session._id), String(item.studentId)),
              descriptionKey: 'billing.charge.perSession',
            },
          ],
        });
        posted += written.length;
      }
    }
    return posted;
  }
}
