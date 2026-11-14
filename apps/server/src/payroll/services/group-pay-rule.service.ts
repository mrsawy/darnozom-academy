import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PayrollErrors } from '@darnozom/shared-types';
import { Group } from '../../academics/group/entities/group.entity';
import { GroupPayRule, GroupPayRuleDocument } from '../entities/group-pay-rule.entity';
import { UpsertGroupPayRulePayload } from '../dto/payroll.dto';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

type LeanRule = GroupPayRule & { _id: Types.ObjectId };

@Injectable()
export class GroupPayRuleService {
  constructor(
    @InjectModel(GroupPayRule.name) private readonly ruleModel: Model<GroupPayRuleDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  /** Sets how a teacher is paid for a group. Appends a new row; the previous one stays as history. */
  async upsert(organizationId: string, dto: UpsertGroupPayRulePayload): Promise<GroupPayRule> {
    const group = await this.groupModel.exists({ _id: oid(dto.groupId), organizationId: oid(organizationId) });
    if (!group) {
      throw new NotFoundException(PayrollErrors.GROUP_NOT_FOUND);
    }

    // A statement totals every group line, so one teacher has one currency across groups.
    const others = await this.current(organizationId, { teacherId: dto.teacherId });
    if (others.some((rule) => String(rule.groupId) !== dto.groupId && rule.currency !== dto.currency)) {
      throw new BadRequestException(PayrollErrors.PAY_RULE_CURRENCY_MISMATCH);
    }

    return this.ruleModel.create({
      organizationId: oid(organizationId),
      teacherId: oid(dto.teacherId),
      groupId: oid(dto.groupId),
      model: dto.model,
      rate: dto.rate,
      currency: dto.currency,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      endedAt: null,
    });
  }

  /** Withdraws a rule: it stops applying to months that start after now, but past statements keep it. */
  async remove(organizationId: string, id: string): Promise<GroupPayRule> {
    const rule = await this.ruleModel.findOne({ _id: oid(id), organizationId: oid(organizationId) });
    if (!rule) {
      throw new NotFoundException(PayrollErrors.GROUP_PAY_RULE_NOT_FOUND);
    }
    rule.endedAt = new Date();
    await rule.save();
    return rule;
  }

  /** The latest rule per (teacher, group) that has not been withdrawn. */
  async current(organizationId: string, filter: { teacherId?: string; groupId?: string } = {}): Promise<LeanRule[]> {
    const match: Record<string, unknown> = { organizationId: oid(organizationId) };
    if (filter.teacherId) match.teacherId = oid(filter.teacherId);
    if (filter.groupId) match.groupId = oid(filter.groupId);

    const rows = await this.ruleModel.aggregate<LeanRule>([
      { $match: match },
      { $sort: { effectiveFrom: -1, createdAt: -1 } },
      { $group: { _id: { teacherId: '$teacherId', groupId: '$groupId' }, rule: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$rule' } },
    ]);
    return rows.filter((rule) => !rule.endedAt);
  }

  /**
   * The rules that price a given month: per (teacher, group) the latest row that took effect before
   * the month ended, skipping rules withdrawn before the month began.
   */
  async effectiveForMonth(organizationId: string, monthStart: Date, monthEnd: Date): Promise<LeanRule[]> {
    const rows = await this.ruleModel.aggregate<LeanRule>([
      { $match: { organizationId: oid(organizationId), effectiveFrom: { $lt: monthEnd } } },
      { $sort: { effectiveFrom: -1, createdAt: -1 } },
      { $group: { _id: { teacherId: '$teacherId', groupId: '$groupId' }, rule: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$rule' } },
    ]);
    return rows.filter((rule) => !rule.endedAt || rule.endedAt > monthStart);
  }
}
