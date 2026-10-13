import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReadinessKey, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { computeReadiness, ReadinessInput } from '../domain/readiness';
import { Task } from './entities/task.entity';
import { TaskRiskService } from './task-risk.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

type GroupForClosing = ReadinessInput & { _id: Types.ObjectId };

@Injectable()
export class TaskClosingService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    private readonly risk: TaskRiskService
  ) {}

  /** Closes the open tasks whose readiness item is now done. Returns how many closed (spec §5.2). */
  async closeDoneItems(group: GroupForClosing, now: Date): Promise<number> {
    const done: ReadinessKey[] = computeReadiness(group)
      .items.filter((item) => item.done)
      .map((item) => item.key);
    if (done.length === 0) return 0;

    const result = await this.taskModel
      .updateMany(
        { groupId: group._id, status: TaskStatus.OPEN, readinessKey: { $in: done } },
        { $set: { status: TaskStatus.DONE, closedAt: now, closedReason: TaskClosedReason.ITEM_DONE } }
      )
      .exec();
    await this.risk.refresh(group._id, now);
    return result.modifiedCount;
  }

  /**
   * Closes everything still open because the group moved on. The status is CANCELLED, not DONE:
   * the missing item was never supplied, and the audit trail should say so.
   */
  async closeAll(
    groupId: Types.ObjectId | string,
    reason: TaskClosedReason.GROUP_STARTED | TaskClosedReason.GROUP_CANCELLED,
    now: Date
  ): Promise<number> {
    const result = await this.taskModel
      .updateMany({ groupId: oid(groupId), status: TaskStatus.OPEN }, { $set: { status: TaskStatus.CANCELLED, closedAt: now, closedReason: reason } })
      .exec();
    await this.risk.refresh(groupId, now);
    return result.modifiedCount;
  }
}
