import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group } from '../../academics/group/entities/group.entity';
import { User } from '../../user/entities/user.entity';
import { GroupPayRule } from '../entities/group-pay-rule.entity';
import { PayStatement } from '../entities/pay-statement.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface PayrollLookup {
  /** Groups that have a teacher assigned: the groups a pay rule can be set for. */
  groups: { id: string; name: string; teacherId: string }[];
  /** Every teacher the payroll screens may need to name: assigned, ruled, or already on a statement. */
  teachers: { id: string; name: string }[];
}

/** Names for the payroll screens, so accountants pick and read teachers and groups, not raw ids. */
@Injectable()
export class PayrollLookupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupPayRule.name) private readonly ruleModel: Model<GroupPayRule>,
    @InjectModel(PayStatement.name) private readonly statementModel: Model<PayStatement>,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  async lookup(organizationId: string): Promise<PayrollLookup> {
    const organization = oid(organizationId);
    const [groups, ruleTeachers, statementTeachers] = await Promise.all([
      this.groupModel
        .find({ organizationId: organization, teacherId: { $ne: null } })
        .select('name teacherId')
        .lean<{ _id: Types.ObjectId; name: string; teacherId: Types.ObjectId }[]>()
        .exec(),
      this.ruleModel.distinct('teacherId', { organizationId: organization }),
      this.statementModel.distinct('teacherId', { organizationId: organization }),
    ]);

    const teacherIds = new Set<string>([...groups.map((g) => String(g.teacherId)), ...ruleTeachers.map(String), ...statementTeachers.map(String)]);
    const users = await this.userModel
      .find({ _id: { $in: [...teacherIds].map(oid) } })
      .select('firstName lastName')
      .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
      .exec();

    return {
      groups: groups.map((g) => ({ id: String(g._id), name: g.name, teacherId: String(g.teacherId) })),
      teachers: [...teacherIds].map((id) => {
        const user = users.find((u) => String(u._id) === id);
        return { id, name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || id };
      }),
    };
  }
}
