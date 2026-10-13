import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtRiskReason, TaskStatus } from '@darnozom/shared-types';
import { Group } from '../group/entities/group.entity';
import { Task } from './entities/task.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class TaskRiskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>
  ) {}

  /** Flags a group at risk. The `atRisk: false` guard keeps the original reason and moment. */
  async flag(groupId: Types.ObjectId | string, reason: AtRiskReason, now: Date): Promise<void> {
    await this.groupModel.updateOne({ _id: oid(groupId), atRisk: false }, { $set: { atRisk: true, atRiskSince: now, atRiskReason: reason } }).exec();
  }

  /** Clears the flag once nothing justifies it: a coordinator is in place and no task is open (spec §5.3). */
  async refresh(groupId: Types.ObjectId | string, _now: Date): Promise<void> {
    const group = await this.groupModel
      .findOne({ _id: oid(groupId) })
      .lean<{ _id: Types.ObjectId; coordinatorId: Types.ObjectId | null; atRisk: boolean } | null>()
      .exec();
    if (!group || !group.atRisk) return;
    if (group.coordinatorId == null) return;

    const open = await this.taskModel.countDocuments({ groupId: group._id, status: TaskStatus.OPEN }).exec();
    if (open > 0) return;

    await this.groupModel.updateOne({ _id: group._id }, { $set: { atRisk: false, atRiskSince: null, atRiskReason: null } }).exec();
  }
}
