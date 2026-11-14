import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';
import { Group } from '../../academics/group/entities/group.entity';
import { User } from '../../user/entities/user.entity';
import { BillingActor } from '../billing.types';
import { ListSubscriptionsPayload } from '../dto/billing.dto';
import { Allocation } from '../entities/allocation.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { BillingSubscription } from '../entities/subscription.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const MAX_ROWS = 1000;

export interface SubscriptionOverviewRow {
  _id: string;
  familyId: string;
  /** The payer: the parent, or the student themselves when no parent is linked. */
  familyName: string;
  holderIsStudent: boolean;
  type: SubscriptionType;
  status: BillingSubscriptionStatus;
  amountMinor: number;
  currency: Currency;
  students: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  chargedMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  note?: string;
  createdAt?: Date;
  endedAt: Date | null;
}

export interface SubscriptionOverviewTotals {
  currency: Currency;
  activeCount: number;
  /** Sum of the amounts of active subscriptions: what the academy bills per cycle. */
  activeAmountMinor: number;
  outstandingMinor: number;
}

export interface SubscriptionOverview {
  rows: SubscriptionOverviewRow[];
  totals: SubscriptionOverviewTotals[];
}

/** The accountant's view across every subscription in the organization, with who pays and what is still owed. */
@Injectable()
export class SubscriptionOverviewService {
  constructor(
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  async list(actor: BillingActor, filter: ListSubscriptionsPayload): Promise<SubscriptionOverview> {
    const query: Record<string, unknown> = { organizationId: oid(actor.organizationId) };
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.groupId) query['items.groupId'] = oid(filter.groupId);

    const subscriptions = await this.subscriptionModel
      .find(query)
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ createdAt: -1 })
      .limit(MAX_ROWS)
      .lean<
        {
          _id: Types.ObjectId;
          familyId: Types.ObjectId;
          items: { studentId: Types.ObjectId; groupId: Types.ObjectId }[];
          type: SubscriptionType;
          status: BillingSubscriptionStatus;
          amountMinor: number;
          currency: Currency;
          note?: string;
          createdAt?: Date;
          endedAt: Date | null;
        }[]
      >()
      .exec();

    const userIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const sub of subscriptions) {
      userIds.add(String(sub.familyId));
      for (const item of sub.items) {
        userIds.add(String(item.studentId));
        groupIds.add(String(item.groupId));
      }
    }

    const [users, groups, money] = await Promise.all([
      this.userModel
        .find({ _id: { $in: [...userIds].map(oid) } })
        .select('firstName lastName')
        .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
        .exec(),
      this.groupModel
        .find({ _id: { $in: [...groupIds].map(oid) } })
        .select('name')
        .lean<{ _id: Types.ObjectId; name: string }[]>()
        .exec(),
      this.moneyBySubscription(
        actor.organizationId,
        subscriptions.map((s) => s._id)
      ),
    ]);

    const nameOf = new Map(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || String(u._id)]));
    const groupName = new Map(groups.map((g) => [String(g._id), g.name]));

    let rows: SubscriptionOverviewRow[] = subscriptions.map((sub) => {
      const studentIds = [...new Set(sub.items.map((i) => String(i.studentId)))];
      const groupIdsOfSub = [...new Set(sub.items.map((i) => String(i.groupId)))];
      const { chargedMinor, paidMinor } = money.get(String(sub._id)) ?? { chargedMinor: 0, paidMinor: 0 };
      return {
        _id: String(sub._id),
        familyId: String(sub.familyId),
        familyName: nameOf.get(String(sub.familyId)) ?? String(sub.familyId),
        holderIsStudent: studentIds.includes(String(sub.familyId)),
        type: sub.type,
        status: sub.status,
        amountMinor: sub.amountMinor,
        currency: sub.currency,
        students: studentIds.map((id) => ({ id, name: nameOf.get(id) ?? id })),
        groups: groupIdsOfSub.map((id) => ({ id, name: groupName.get(id) ?? id })),
        chargedMinor,
        paidMinor,
        outstandingMinor: Math.max(0, chargedMinor - paidMinor),
        note: sub.note,
        createdAt: sub.createdAt,
        endedAt: sub.endedAt ?? null,
      };
    });

    if (filter.holder) {
      rows = rows.filter((row) => (filter.holder === 'STUDENT' ? row.holderIsStudent : !row.holderIsStudent));
    }
    const needle = filter.search?.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((row) =>
        [row.familyName, ...row.students.map((s) => s.name), ...row.groups.map((g) => g.name)].some((text) => text.toLowerCase().includes(needle))
      );
    }

    return { rows, totals: this.totalsOf(rows) };
  }

  private totalsOf(rows: SubscriptionOverviewRow[]): SubscriptionOverviewTotals[] {
    // Per currency, never summed across currencies: there is no exchange rate here.
    const byCurrency = new Map<Currency, SubscriptionOverviewTotals>();
    for (const row of rows) {
      const total = byCurrency.get(row.currency) ?? { currency: row.currency, activeCount: 0, activeAmountMinor: 0, outstandingMinor: 0 };
      if (row.status === BillingSubscriptionStatus.ACTIVE) {
        total.activeCount += 1;
        total.activeAmountMinor += row.amountMinor;
      }
      total.outstandingMinor += row.outstandingMinor;
      byCurrency.set(row.currency, total);
    }
    return [...byCurrency.values()];
  }

  /** Charged and paid per subscription: paid is what allocations have settled against its charges. */
  private async moneyBySubscription(
    organizationId: string,
    subscriptionIds: Types.ObjectId[]
  ): Promise<Map<string, { chargedMinor: number; paidMinor: number }>> {
    const result = new Map<string, { chargedMinor: number; paidMinor: number }>();
    if (subscriptionIds.length === 0) return result;

    const charges = await this.entryModel
      .find({ organizationId: oid(organizationId), subscriptionId: { $in: subscriptionIds }, type: LedgerEntryType.CHARGE })
      .select('subscriptionId amountMinor')
      .lean<{ _id: Types.ObjectId; subscriptionId: Types.ObjectId; amountMinor: number }[]>()
      .exec();
    if (charges.length === 0) return result;

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: charges.map((c) => c._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const paidByCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    for (const charge of charges) {
      const key = String(charge.subscriptionId);
      const current = result.get(key) ?? { chargedMinor: 0, paidMinor: 0 };
      current.chargedMinor += charge.amountMinor;
      current.paidMinor += paidByCharge.get(String(charge._id)) ?? 0;
      result.set(key, current);
    }
    return result;
  }
}
