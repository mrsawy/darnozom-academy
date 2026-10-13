import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtRiskReason, TaskStatus, TASK_ESCALATION_HOURS, TASK_MAX_ESCALATION_LEVEL } from '@darnozom/shared-types';
import { Group } from '../group/entities/group.entity';
import { Task } from './entities/task.entity';
import { TaskLean } from './task.types';
import { TaskNotificationService } from './task-notification.service';
import { TaskRiskService } from './task-risk.service';
import { TaskUserService } from './task-user.service';

interface GroupForEscalation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  coordinatorId: Types.ObjectId | null;
  supervisorId: Types.ObjectId | null;
}

@Injectable()
export class TaskEscalationService {
  private readonly logger = new Logger(TaskEscalationService.name);

  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly notifications: TaskNotificationService,
    private readonly users: TaskUserService,
    private readonly risk: TaskRiskService
  ) {}

  /** Moves every overdue task one level up the chain. Returns how many were moved or reassigned. */
  async run(now: Date): Promise<number> {
    const overdue = await this.taskModel
      .find({ status: TaskStatus.OPEN, dueAt: { $lte: now } })
      .lean<TaskLean[]>()
      .exec();
    if (overdue.length === 0) return 0;

    const groups = await this.groupModel
      .find({ _id: { $in: overdue.map((t) => t.groupId) } })
      .select('_id organizationId name coordinatorId supervisorId')
      .lean<GroupForEscalation[]>()
      .exec();
    const byId = new Map(groups.map((g) => [String(g._id), g]));

    let moved = 0;
    for (const task of overdue) {
      const group = byId.get(String(task.groupId));
      if (!group) continue;
      try {
        if (await this.step(task, group, now)) moved += 1;
      } catch (error) {
        this.logger.error(`Escalation skipped for task ${String(task._id)}: ${(error as Error).message}`);
      }
    }
    return moved;
  }

  private async step(task: TaskLean, group: GroupForEscalation, now: Date): Promise<boolean> {
    const nextDue = new Date(now.getTime() + TASK_ESCALATION_HOURS * 3_600_000);

    if (task.escalationLevel >= TASK_MAX_ESCALATION_LEVEL) return false;

    if (task.escalationLevel === 0) {
      if (group.coordinatorId == null) {
        // Seat is empty — the group itself is the problem (Review Focus 5).
        await this.risk.flag(group._id, AtRiskReason.NO_COORDINATOR, now);
      } else if (String(group.coordinatorId) !== String(task.assigneeId)) {
        // Seat changed hands; give the new coordinator their own window before escalating.
        await this.apply(task, { assigneeId: group.coordinatorId, dueAt: nextDue });
        await this.notifications.taskAssigned(task, group.name, [String(group.coordinatorId)]);
        return true;
      }
    }

    const toLevel = task.escalationLevel === 0 && group.supervisorId != null ? 1 : TASK_MAX_ESCALATION_LEVEL;
    const assigneeId = toLevel === 1 ? group.supervisorId : null;
    await this.apply(task, { escalationLevel: toLevel, assigneeId, dueAt: nextDue });

    const recipients = toLevel === 1 ? [String(group.supervisorId)] : await this.users.managerIdsInOrg(group.organizationId);
    await this.notifications.taskEscalated({ ...task, escalationLevel: toLevel }, group.name, recipients);

    if (toLevel === TASK_MAX_ESCALATION_LEVEL) await this.risk.flag(group._id, AtRiskReason.TASK_ESCALATED, now);
    return true;
  }

  private async apply(task: TaskLean, set: Record<string, unknown>): Promise<void> {
    await this.taskModel.updateOne({ _id: task._id, status: TaskStatus.OPEN }, { $set: set }).exec();
  }
}
