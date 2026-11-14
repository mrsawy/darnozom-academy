import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Currency, GroupStudentStatus, hasAnyRole, LedgerEntryType, PayStatementStatus, PayrollErrors, Roles } from '@darnozom/shared-types';
import { PayStatement, PayStatementLine } from '../entities/pay-statement.entity';
import { GroupPayRuleService } from './group-pay-rule.service';
import { BillingSubscription } from '../../billing/entities/subscription.entity';
import { Session } from '../../academics/session/entities/session.entity';
import { Group } from '../../academics/group/entities/group.entity';
import { LedgerEntry } from '../../billing/entities/ledger-entry.entity';
import { Allocation } from '../../billing/entities/allocation.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { AddBonusDto, MarkPaidDto } from '../dto/payroll.dto';
import { calculateGroupAmount, calculateTotal, getMonthInterval, isSessionCountable } from '../domain/payroll-calculator';
import { DisputeActor } from './session-dispute.service';

const STAFF_ROLES: Roles[] = [Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.ACCOUNTANT, Roles.SUPER_ADMIN];

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(PayStatement.name)
    private readonly statementModel: Model<PayStatement>,
    private readonly ruleService: GroupPayRuleService,
    @InjectModel(BillingSubscription.name)
    private readonly subscriptionModel: Model<BillingSubscription>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    @InjectModel(LedgerEntry.name)
    private readonly ledgerEntryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name)
    private readonly allocationModel: Model<Allocation>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>
  ) {}

  /**
   * Builds (or refreshes) one DRAFT statement per teacher for the month. A teacher's pay is the sum of
   * one line per group they have a pay rule for: a fixed amount, a percentage of what was collected
   * from the group's subscriptions, or a fixed amount per active subscription. Approved and paid
   * statements are never touched.
   */
  async generateStatements(organizationId: string, month: string): Promise<PayStatement[]> {
    const orgOid = new Types.ObjectId(organizationId);
    const org = await this.organizationModel.findById(orgOid);
    const tz = org?.timezone || 'UTC';

    const monthInterval = getMonthInterval(month, tz);
    const rules = await this.ruleService.effectiveForMonth(organizationId, monthInterval.start, monthInterval.end);

    const rulesByTeacher = new Map<string, typeof rules>();
    for (const rule of rules) {
      const key = String(rule.teacherId);
      rulesByTeacher.set(key, [...(rulesByTeacher.get(key) ?? []), rule]);
    }

    const groupIds = [...new Set(rules.map((rule) => String(rule.groupId)))];
    const groups = groupIds.length > 0 ? await this.groupModel.find({ _id: { $in: groupIds.map((id) => new Types.ObjectId(id)) } }) : [];
    const groupById = new Map(groups.map((g) => [String(g._id), g]));

    const generated: PayStatement[] = [];

    for (const [teacherId, teacherRules] of rulesByTeacher) {
      const teacherOid = new Types.ObjectId(teacherId);

      const existing = await this.statementModel.findOne({
        organizationId: orgOid,
        teacherId: teacherOid,
        month,
      });

      if (existing && (existing.status === PayStatementStatus.APPROVED || existing.status === PayStatementStatus.PAID)) {
        continue;
      }

      const sessions = await this.sessionModel.find({
        organizationId: orgOid,
        teacherId: teacherOid,
        startsAt: { $gte: monthInterval.start, $lt: monthInterval.end },
      });
      const countable = sessions.filter((s) => isSessionCountable(s, teacherId, monthInterval));

      const lines: PayStatementLine[] = [];
      const studentIds = new Set<string>();
      let totalMinutes = 0;
      let totalSessions = 0;
      let totalCollected = 0;

      for (const rule of teacherRules) {
        const groupId = String(rule.groupId);
        const group = groupById.get(groupId);
        if (!group) continue;

        const groupSessions = countable.filter((s) => String(s.groupId) === groupId);
        const minutes = groupSessions.reduce((acc, s) => {
          const startMs = s.startsAt.getTime();
          const endMs = s.endsAt ? s.endsAt.getTime() : startMs;
          return acc + Math.max(0, Math.round((endMs - startMs) / 60_000));
        }, 0);

        const subscriptions = await this.countActiveSubscriptions(orgOid, rule.groupId, rule.currency, monthInterval);
        const collected = await this.collectedForGroup(orgOid, rule.groupId, rule.currency, monthInterval);

        for (const st of group.students ?? []) {
          if (st.status === GroupStudentStatus.ACTIVE) studentIds.add(String(st.studentId));
        }

        const amount = calculateGroupAmount(rule.model, rule.rate, { subscriptions, collected });
        totalMinutes += minutes;
        totalSessions += groupSessions.length;
        totalCollected += collected;

        lines.push({
          groupId: rule.groupId,
          groupName: group.name,
          model: rule.model,
          rate: rule.rate,
          currency: rule.currency,
          subscriptions,
          collected,
          sessions: groupSessions.length,
          amount,
        });
      }

      if (lines.length === 0) continue;

      const basis = { sessions: totalSessions, minutes: totalMinutes, students: studentIds.size, revenue: totalCollected };
      const baseAmount = Math.round((lines.reduce((acc, l) => acc + l.amount, 0) + Number.EPSILON) * 100) / 100;
      const total = calculateTotal(baseAmount, existing?.bonuses ?? []);
      const countedSessionIds = countable.map((s) => s._id);
      const currency = lines[0].currency;

      if (existing) {
        existing.lines = lines;
        existing.currency = currency;
        existing.countedSessionIds = countedSessionIds;
        existing.basis = basis;
        existing.baseAmount = baseAmount;
        existing.total = total;
        await existing.save();
        generated.push(existing);
      } else {
        generated.push(
          await this.statementModel.create({
            organizationId: orgOid,
            teacherId: teacherOid,
            month,
            lines,
            currency,
            countedSessionIds,
            basis,
            baseAmount,
            bonuses: [],
            total,
            status: PayStatementStatus.DRAFT,
          })
        );
      }
    }

    return generated;
  }

  /** Subscriptions touching the group that were live at any point during the month. */
  private countActiveSubscriptions(
    organizationId: Types.ObjectId,
    groupId: Types.ObjectId,
    currency: Currency,
    interval: { start: Date; end: Date }
  ): Promise<number> {
    return this.subscriptionModel.countDocuments({
      organizationId,
      currency,
      'items.groupId': groupId,
      createdAt: { $lt: interval.end },
      $or: [{ endedAt: null }, { endedAt: { $gte: interval.start } }],
    });
  }

  /** Subscription money paid in the month toward the group's charges, in major units. */
  private async collectedForGroup(
    organizationId: Types.ObjectId,
    groupId: Types.ObjectId,
    currency: Currency,
    interval: { start: Date; end: Date }
  ): Promise<number> {
    const charges = await this.ledgerEntryModel
      .find({ organizationId, groupId, currency, type: LedgerEntryType.CHARGE })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>();
    if (charges.length === 0) return 0;

    const rows = await this.allocationModel.aggregate<{ total: number }>([
      {
        $match: {
          organizationId,
          chargeLedgerEntryId: { $in: charges.map((c) => c._id) },
          createdAt: { $gte: interval.start, $lt: interval.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]);
    return (rows[0]?.total ?? 0) / 100;
  }

  async addBonus(statementId: string, dto: AddBonusDto, actorId: string): Promise<PayStatement> {
    if (dto.amount <= 0) {
      throw new BadRequestException(PayrollErrors.BONUS_AMOUNT_INVALID);
    }

    const statement = await this.statementModel.findById(statementId);
    if (!statement) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (statement.status !== PayStatementStatus.DRAFT) {
      throw new ConflictException(PayrollErrors.STATEMENT_ALREADY_APPROVED);
    }

    statement.bonuses = statement.bonuses || [];
    statement.bonuses.push({
      amount: dto.amount,
      reason: dto.reason.trim(),
      addedBy: new Types.ObjectId(actorId),
      addedAt: new Date(),
    });

    statement.total = calculateTotal(statement.baseAmount, statement.bonuses);
    await statement.save();
    return statement;
  }

  async approveStatement(statementId: string, actorId: string): Promise<PayStatement> {
    const statement = await this.statementModel.findById(statementId);
    if (!statement) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (statement.status !== PayStatementStatus.DRAFT) {
      throw new ConflictException(PayrollErrors.STATEMENT_ALREADY_APPROVED);
    }

    statement.status = PayStatementStatus.APPROVED;
    statement.approvedBy = new Types.ObjectId(actorId);
    statement.approvedAt = new Date();

    await statement.save();
    return statement;
  }

  async markPaid(statementId: string, dto: MarkPaidDto, actorId: string): Promise<PayStatement> {
    const statement = await this.statementModel.findById(statementId);
    if (!statement) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (statement.status === PayStatementStatus.DRAFT) {
      throw new ConflictException(PayrollErrors.STATEMENT_NOT_APPROVED);
    }

    if (statement.status === PayStatementStatus.PAID) {
      throw new ConflictException(PayrollErrors.STATEMENT_ALREADY_PAID);
    }

    statement.status = PayStatementStatus.PAID;
    statement.paidBy = new Types.ObjectId(actorId);
    statement.paidAt = new Date();
    if (dto.paymentReference) {
      statement.paymentReference = dto.paymentReference.trim();
    }

    await statement.save();
    return statement;
  }

  async findStatements(
    organizationId: string,
    query: { month?: string; teacherId?: string; status?: PayStatementStatus } = {},
    actor: DisputeActor
  ): Promise<PayStatement[]> {
    const orgOid = new Types.ObjectId(organizationId);
    const filter: FilterQuery<PayStatement> = { organizationId: orgOid };

    if (hasAnyRole(actor, STAFF_ROLES)) {
      if (query.teacherId) {
        filter.teacherId = new Types.ObjectId(query.teacherId);
      }
      if (query.status) {
        filter.status = query.status;
      }
    } else {
      // Instructor view: only own statements, and only approved or paid
      filter.teacherId = new Types.ObjectId(actor._id);
      filter.status = { $in: [PayStatementStatus.APPROVED, PayStatementStatus.PAID] };
    }

    if (query.month) {
      filter.month = query.month;
    }

    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort
    return this.statementModel.find(filter).sort({ month: -1, createdAt: -1 });
  }

  async getStatementById(statementId: string, actor: DisputeActor): Promise<PayStatement> {
    const statement = await this.statementModel.findById(statementId);
    if (!statement || statement.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    if (
      !hasAnyRole(actor, STAFF_ROLES) && // Must be own statement and approved or paid
      (statement.teacherId.toString() !== actor._id || statement.status === PayStatementStatus.DRAFT)
    ) {
      throw new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND);
    }

    return statement;
  }
}
