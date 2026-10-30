import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingSubscriptionStatus, Currency, FamilyPaymentState, FamilyPaymentStatus, LedgerEntryType, SubscriptionType } from '@darnozom/shared-types';
import { Allocation } from '../entities/allocation.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { BillingSubscription } from '../entities/subscription.entity';
import { FamilyPayment } from '../entities/payment.entity';
import { ChargeForStatus, isStudentPaid } from '../domain/payment-status';

const oid = (id: string | Types.ObjectId) =>
  Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId);

/**
 * The read-only face billing presents to academics. Academics injects this directly; billing never
 * imports academics, which is what keeps the two acyclic (plan decision D3).
 */
@Injectable()
export class FamilyPaymentStatusService {
  constructor(
    @InjectModel(BillingSubscription.name) private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>,
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>
  ) {}

  /** The active subscriptions covering this group's roster, and which students a FAMILY subscription fans out to. */
  private async subscriptionsForGroup(groupId: string | Types.ObjectId, studentIds: string[]) {
    const subscriptions = await this.subscriptionModel
      .find({
        status: BillingSubscriptionStatus.ACTIVE,
        'items.groupId': oid(groupId),
        'items.studentId': { $in: studentIds.map(oid) },
      })
      .lean<
        {
          _id: Types.ObjectId;
          familyId: Types.ObjectId;
          type: SubscriptionType;
          amountMinor: number;
          items: { studentId: Types.ObjectId; groupId: Types.ObjectId }[];
        }[]
      >()
      .exec();

    const subscriptionByStudent = new Map<string, { amountMinor: number; familyId: Types.ObjectId }>();
    const familySubToStudents = new Map<string, string[]>();

    for (const subscription of subscriptions) {
      const isFamily = subscription.type === SubscriptionType.FAMILY;
      const familyStudentIds: string[] = [];

      for (const item of subscription.items) {
        if (String(item.groupId) !== String(groupId)) continue;
        const sId = String(item.studentId);
        subscriptionByStudent.set(sId, { amountMinor: subscription.amountMinor, familyId: subscription.familyId });
        if (isFamily) familyStudentIds.push(sId);
      }

      if (isFamily && familyStudentIds.length > 0) {
        familySubToStudents.set(String(subscription._id), familyStudentIds);
      }
    }

    return { subscriptionByStudent, familySubToStudents };
  }

  /** studentId → PAID/UNPAID for one group, in a fixed number of queries whatever the roster size. */
  async forGroup(
    groupId: string | Types.ObjectId,
    studentIds: string[],
    cohortStartDate: Date | null,
    now: Date = new Date()
  ): Promise<Map<string, FamilyPaymentStatus>> {
    const result = new Map<string, FamilyPaymentStatus>();
    if (studentIds.length === 0) return result;

    const { subscriptionByStudent, familySubToStudents } = await this.subscriptionsForGroup(groupId, studentIds);

    const studentObjectIds = studentIds.map(oid);
    const familySubIds = [...familySubToStudents.keys()].map(oid);

    const chargeFilter: Record<string, unknown> = {
      type: LedgerEntryType.CHARGE,
      $or: [
        { groupId: oid(groupId), studentId: { $in: studentObjectIds } },
        ...(familySubIds.length > 0 ? [{ subscriptionId: { $in: familySubIds } }] : []),
      ],
    };

    const charges = await this.entryModel
      .find(chargeFilter)
      .lean<
        {
          _id: Types.ObjectId;
          studentId?: Types.ObjectId | null;
          subscriptionId?: Types.ObjectId | null;
          amountMinor: number;
          dueAt: Date | null;
          currency: Currency;
        }[]
      >()
      .exec();

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: charges.map((charge) => charge._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const allocatedByCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    const chargesByStudent = new Map<string, ChargeForStatus[]>();

    for (const charge of charges) {
      const chargeData: ChargeForStatus = {
        amountMinor: charge.amountMinor,
        allocatedMinor: allocatedByCharge.get(String(charge._id)) ?? 0,
        dueAt: charge.dueAt,
        currency: charge.currency,
      };

      if (charge.subscriptionId && familySubToStudents.has(String(charge.subscriptionId))) {
        const siblings = familySubToStudents.get(String(charge.subscriptionId))!;
        for (const sId of siblings) {
          const list = chargesByStudent.get(sId) ?? [];
          list.push(chargeData);
          chargesByStudent.set(sId, list);
        }
      } else if (charge.studentId) {
        const key = String(charge.studentId);
        const list = chargesByStudent.get(key) ?? [];
        list.push(chargeData);
        chargesByStudent.set(key, list);
      }
    }

    for (const studentId of studentIds) {
      const subscription = subscriptionByStudent.get(studentId);
      result.set(
        studentId,
        isStudentPaid({
          hasActiveSubscription: subscription !== undefined,
          subscriptionAmountMinor: subscription?.amountMinor ?? 0,
          cohortStartDate,
          charges: chargesByStudent.get(studentId) ?? [],
          now,
        })
      );
    }
    return result;
  }

  /**
   * studentIds whose family has a FamilyPayment pending review and an active subscription covering
   * this group. `subscriptionsForGroup` already assigns every FAMILY-subscription sibling their own
   * entry, so no extra fan-out is needed here.
   */
  async hasPendingReview(groupId: string | Types.ObjectId, studentIds: string[]): Promise<Set<string>> {
    const result = new Set<string>();
    if (studentIds.length === 0) return result;

    const { subscriptionByStudent } = await this.subscriptionsForGroup(groupId, studentIds);
    if (subscriptionByStudent.size === 0) return result;

    const familyIds = [...new Set([...subscriptionByStudent.values()].map((s) => String(s.familyId)))];
    const pending = await this.paymentModel
      .find({ status: FamilyPaymentState.PENDING_REVIEW, familyId: { $in: familyIds.map(oid) } })
      .lean<{ familyId: Types.ObjectId }[]>()
      .exec();
    const pendingFamilyIds = new Set(pending.map((p) => String(p.familyId)));
    if (pendingFamilyIds.size === 0) return result;

    for (const [studentId, sub] of subscriptionByStudent) {
      if (pendingFamilyIds.has(String(sub.familyId))) result.add(studentId);
    }
    return result;
  }
}
