import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtRiskReason, GroupStatus, ReadinessKey, TaskKind, TaskStatus, TASK_ESCALATION_HOURS } from '@darnozom/shared-types';
import { withNotDeletedFilter } from 'src/utils/soft-delete';
import { Cohort } from '../cohort/entities/cohort.entity';
import { computeReadiness } from '../domain/readiness';
import { reachedMilestones } from '../domain/milestones';
import { Group } from '../group/entities/group.entity';
import { GroupLean } from '../group/group.types';
import { Task } from './entities/task.entity';
import { TaskLean } from './task.types';
import { TaskNotificationService } from './task-notification.service';
import { TaskUserService } from './task-user.service';

const DUPLICATE_KEY = 11_000;

@Injectable()
export class TaskGenerationService {
  private readonly logger = new Logger(TaskGenerationService.name);

  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly notifications: TaskNotificationService,
    private readonly users: TaskUserService
  ) {}

  /** Creates a task for every missing readiness item of every group past a milestone. Returns how many. */
  async run(now: Date): Promise<number> {
    const groups = await this.groupModel
      .find(withNotDeletedFilter({ status: { $in: [GroupStatus.FORMING, GroupStatus.READY_TO_START] } }))
      .lean<GroupLean[]>()
      .exec();
    if (groups.length === 0) return 0;

    const cohorts = await this.cohortModel
      .find({ _id: { $in: groups.map((group) => group.cohortId) } })
      .lean<{ _id: Types.ObjectId; startDate: Date }[]>()
      .exec();
    const startDates = new Map(cohorts.map((cohort) => [String(cohort._id), cohort.startDate]));

    let created = 0;
    for (const group of groups) {
      try {
        created += await this.runForGroup(group, startDates.get(String(group.cohortId)), now);
      } catch (error) {
        // One malformed group must never abort the sweep for every other group.
        this.logger.error(`Pre-start tasks skipped for group ${String(group._id)}: ${(error as Error).message}`);
      }
    }
    return created;
  }

  private async runForGroup(group: GroupLean, startDate: Date | undefined, now: Date): Promise<number> {
    if (!startDate) return 0;
    const reached = reachedMilestones(startDate, group.timezone, now);
    if (reached.length === 0) return 0;

    const missing = computeReadiness(group)
      .items.filter((item) => !item.done)
      .map((item) => item.key);

    if (group.coordinatorId == null) {
      // Nobody can receive the tasks, so the group itself is the problem (spec §5.1, assumption A3).
      await this.flagNoCoordinator(group._id, now);
      return 0;
    }
    if (missing.length === 0) return 0;

    // The nearest milestone reached is the one the person needs to see (plan decision D3).
    const milestoneDays = Math.min(...reached);
    let created = 0;
    for (const readinessKey of missing) {
      if (await this.createOrTighten(group, readinessKey, milestoneDays, now)) created += 1;
    }
    return created;
  }

  /** True when a task was created. A tightened milestone is not a creation and raises no notification. */
  private async createOrTighten(group: GroupLean, readinessKey: ReadinessKey, milestoneDays: number, now: Date): Promise<boolean> {
    try {
      const task = await this.taskModel.create({
        organizationId: group.organizationId,
        groupId: group._id,
        kind: TaskKind.PRE_START_READINESS,
        readinessKey,
        milestoneDays,
        assigneeId: group.coordinatorId,
        escalationLevel: 0,
        dueAt: new Date(now.getTime() + TASK_ESCALATION_HOURS * 3600 * 1000),
        status: TaskStatus.OPEN,
      });
      await this.notifications.taskAssigned(task as unknown as TaskLean, group.name, [String(group.coordinatorId)]);
      return true;
    } catch (error) {
      if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      // An open task already covers this item; only the deadline may have tightened.
      await this.taskModel
        .updateOne({ groupId: group._id, readinessKey, status: TaskStatus.OPEN, milestoneDays: { $gt: milestoneDays } }, { $set: { milestoneDays } })
        .exec();
      return false;
    }
  }

  private async flagNoCoordinator(groupId: Types.ObjectId, now: Date): Promise<void> {
    await this.groupModel
      .updateOne({ _id: groupId, atRisk: false }, { $set: { atRisk: true, atRiskSince: now, atRiskReason: AtRiskReason.NO_COORDINATOR } })
      .exec();
  }
}
