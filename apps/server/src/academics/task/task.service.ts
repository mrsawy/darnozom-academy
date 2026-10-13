import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, hasRole, Roles, TaskClosedReason, TaskStatus } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { computeReadiness, ReadinessInput } from '../domain/readiness';
import { Group } from '../group/entities/group.entity';
import { Task } from './entities/task.entity';
import { TaskLean, TaskView } from './task.types';
import { TaskRiskService } from './task-risk.service';
import { FindTasksPayload } from './dto/task.dto';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const isManager = (actor: AcademicsActor) => hasRole(actor, Roles.MANAGER) || hasRole(actor, Roles.OWNER);

type GroupForTask = ReadinessInput & { _id: Types.ObjectId; name: string };

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly risk: TaskRiskService
  ) {}

  /** The caller's queue: their own tasks, plus the manager queue when they hold MANAGER or OWNER. */
  async findMine(actor: AcademicsActor, query: FindTasksPayload): Promise<TaskView[]> {
    const or: FilterQuery<Task>[] = [{ assigneeId: oid(actor._id) }];
    if (isManager(actor)) or.push({ assigneeId: null });

    const filter: FilterQuery<Task> = { organizationId: oid(actor.organizationId), $or: or };
    if (query.status) filter.status = query.status;
    if (query.groupId) filter.groupId = oid(query.groupId);

    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.withGroupNames(await this.taskModel.find(filter).sort({ dueAt: 1 }).lean<TaskLean[]>().exec());
  }

  /** Every open task of one group, for the group formation screen. */
  async findForGroup(actor: AcademicsActor, groupId: string): Promise<TaskView[]> {
    const tasks = await this.taskModel
      .find({ organizationId: oid(actor.organizationId), groupId: oid(groupId), status: TaskStatus.OPEN })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ dueAt: 1 })
      .lean<TaskLean[]>()
      .exec();
    return this.withGroupNames(tasks);
  }

  /**
   * The assignee closes a task by hand — but only once the problem it reports is gone, so a task
   * can never be dismissed while the group is still missing the item (spec §5.2).
   */
  async markDone(actor: AcademicsActor, id: string): Promise<TaskView> {
    const task = await this.taskModel
      .findOne({ _id: oid(id), organizationId: oid(actor.organizationId), status: TaskStatus.OPEN })
      .lean<TaskLean>()
      .exec();
    if (!task) throw new NotFoundException(AcademicsErrors.TASK_NOT_FOUND);

    const mine = task.assigneeId != null && String(task.assigneeId) === actor._id;
    const managerQueue = task.assigneeId == null && isManager(actor);
    if (!mine && !managerQueue) throw new ForbiddenException(AcademicsErrors.TASK_NOT_ASSIGNED_TO_YOU);

    const group = await this.groupModel.findOne({ _id: task.groupId }).lean<GroupForTask>().exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);

    const itemDone = computeReadiness(group).items.find((item) => item.key === task.readinessKey)?.done === true;
    if (!itemDone) throw new ConflictException(AcademicsErrors.READINESS_ITEM_STILL_MISSING);

    const now = new Date();
    await this.taskModel
      .updateOne(
        { _id: task._id, status: TaskStatus.OPEN },
        { $set: { status: TaskStatus.DONE, closedAt: now, closedReason: TaskClosedReason.ITEM_DONE } }
      )
      .exec();
    await this.risk.refresh(task.groupId, now);
    return { ...task, status: TaskStatus.DONE, closedAt: now, closedReason: TaskClosedReason.ITEM_DONE, groupName: group.name };
  }

  private async withGroupNames(tasks: TaskLean[]): Promise<TaskView[]> {
    if (tasks.length === 0) return [];
    const groups = await this.groupModel
      .find({ _id: { $in: tasks.map((t) => t.groupId) } })
      .select('_id name')
      .lean<{ _id: Types.ObjectId; name: string }[]>()
      .exec();
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    return tasks.map((t) => ({ ...t, groupName: names.get(String(t.groupId)) ?? '' }));
  }
}
