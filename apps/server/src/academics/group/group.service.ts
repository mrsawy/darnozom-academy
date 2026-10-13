import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages, GroupStatus, GroupStudentStatus, TaskClosedReason } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { ParentService } from 'src/user/services/parent.service';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { resolveGroupScope } from '../domain/group-scope';
import { checkStatusTransition } from '../domain/group-status';
import { computeReadiness } from '../domain/readiness';
import { isScheduleChange } from '../domain/schedule-change';
import { isValidSchedule } from '../domain/time';
import { Level } from '../level/entities/level.entity';
import { CreateGroupDto, FindGroupsPayload, UpdateGroupDto } from './dto/group.dto';
import { Group } from './entities/group.entity';
import { GroupStateService } from './group-state.service';
import { GroupTeacherService } from './group-teacher.service';
import { GroupDetailView, GroupLean, GroupView } from './group.types';
import { TaskClosingService } from '../task/task-closing.service';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly state: GroupStateService,
    private readonly parentService: ParentService,
    private readonly groupTeacher: GroupTeacherService,
    private readonly taskClosing: TaskClosingService
  ) {}

  /** Null means the actor may not read any group. visibleStudentIds limits which student entries are returned (null = all). */
  private async resolveScope(
    actor: AcademicsActor,
    childId?: string
  ): Promise<{ filter: FilterQuery<Group>; visibleStudentIds: string[] | null } | null> {
    const scope = resolveGroupScope(actor);
    switch (scope.kind) {
      case 'ORG': {
        return {
          filter: { organizationId: oid(actor.organizationId), ...(childId ? { 'students.studentId': oid(childId) } : {}) },
          visibleStudentIds: null,
        };
      }
      case 'TEACHER': {
        return { filter: { teacherId: oid(scope.teacherId) }, visibleStudentIds: null };
      }
      case 'PARENT': {
        if (childId) {
          await this.parentService.validateParentChildLink(oid(scope.parentId), oid(childId));
          return { filter: { 'students.studentId': oid(childId) }, visibleStudentIds: [childId] };
        }
        const parentDoc = await this.userModel
          .findOne({ _id: oid(scope.parentId) })
          .select('childUsersIds')
          .lean<{ childUsersIds?: Types.ObjectId[] }>()
          .exec();
        const childIds = parentDoc?.childUsersIds ?? [];
        return { filter: { 'students.studentId': { $in: childIds } }, visibleStudentIds: childIds.map(String) };
      }
      case 'STUDENT': {
        return { filter: { 'students.studentId': oid(scope.studentId) }, visibleStudentIds: [scope.studentId] };
      }
      default: {
        return null;
      }
    }
  }

  /** Families see only their own children's entries (not other children's payment status) and no status history. */
  private present(group: GroupLean, visibleStudentIds: string[] | null): GroupView {
    const view = this.state.toView(group);
    if (!visibleStudentIds) return view;
    return { ...view, students: view.students.filter((s) => visibleStudentIds.includes(String(s.studentId))), statusHistory: [] };
  }

  private async peopleNames(view: GroupView): Promise<Record<string, string>> {
    const ids = [...view.students.map((s) => s.studentId), ...(view.teacherId ? [view.teacherId] : [])];
    if (ids.length === 0) return {};
    const users = await this.userModel
      .find({ _id: { $in: ids } })
      .select('_id firstName lastName')
      .lean<{ _id: Types.ObjectId; firstName?: string; lastName?: string }[]>()
      .exec();
    return Object.fromEntries(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  }

  async findAll(actor: AcademicsActor, query: FindGroupsPayload): Promise<GroupView[]> {
    const resolved = await this.resolveScope(actor, query.childId);
    if (!resolved) return [];
    const requested: FilterQuery<Group> = {};
    if (query.cohortId) requested.cohortId = oid(query.cohortId);
    if (query.status) requested.status = query.status;
    if (query.teacherId) requested.teacherId = oid(query.teacherId);
    // The scope goes last so it always overrides the requested filters.
    const groups = await this.groupModel
      .find(withNotDeletedFilter({ ...requested, ...resolved.filter }))
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
      .sort({ createdAt: -1 })
      .lean<GroupLean[]>()
      .exec();
    return groups.map((group) => this.present(group, resolved.visibleStudentIds));
  }

  async findOne(actor: AcademicsActor, id: string): Promise<GroupDetailView> {
    const resolved = await this.resolveScope(actor);
    if (!resolved) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const group = await this.groupModel
      .findOne(withNotDeletedFilter({ ...resolved.filter, _id: oid(id) }))
      .lean<GroupLean>()
      .exec();
    if (!group) throw new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND);
    const view = this.present(group, resolved.visibleStudentIds);
    return { ...view, people: await this.peopleNames(view) };
  }

  async create(actor: AcademicsActor, dto: CreateGroupDto): Promise<GroupView> {
    const cohort = await this.cohortModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.cohortId), organizationId: oid(actor.organizationId) }))
      .lean<{ _id: Types.ObjectId; levelId: Types.ObjectId }>()
      .exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);
    const level = await this.levelModel
      .findOne({ _id: cohort.levelId })
      .select('_id courseId')
      .lean<{ _id: Types.ObjectId; courseId: Types.ObjectId }>()
      .exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);
    if (!isValidSchedule(dto.schedule)) throw new BadRequestException(AcademicsErrors.INVALID_SCHEDULE);
    if (dto.maxStudents < dto.minStudents) throw new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS);

    const created = await this.groupModel.create({
      organizationId: oid(actor.organizationId),
      cohortId: cohort._id,
      levelId: level._id,
      courseId: level.courseId,
      name: dto.name.trim(),
      schedule: dto.schedule,
      timezone: dto.timezone,
      minStudents: dto.minStudents,
      maxStudents: dto.maxStudents,
      totalSessions: dto.totalSessions,
      meetingLink: dto.meetingLink ?? null,
      whatsappGroupLink: dto.whatsappGroupLink ?? null,
    });
    return this.state.toView(created.toObject() as unknown as GroupLean);
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateGroupDto): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    if (dto.schedule !== undefined && !isValidSchedule(dto.schedule)) throw new BadRequestException(AcademicsErrors.INVALID_SCHEDULE);
    const scheduleChanged = isScheduleChange(group, dto);
    const totalChanged = dto.totalSessions !== undefined && dto.totalSessions !== group.totalSessions;
    if (group.status === GroupStatus.RUNNING && (scheduleChanged || totalChanged)) {
      throw new ConflictException(AcademicsErrors.GROUP_RUNNING_SCHEDULE_LOCKED);
    }
    const minStudents = dto.minStudents ?? group.minStudents;
    const maxStudents = dto.maxStudents ?? group.maxStudents;
    const activeCount = group.students.filter((s) => s.status !== GroupStudentStatus.WITHDRAWN).length;
    if (maxStudents < minStudents || maxStudents < activeCount) throw new BadRequestException(AcademicsErrors.INVALID_STUDENT_LIMITS);
    if (scheduleChanged) {
      await this.groupTeacher.assertScheduleChangeFits(actor, group, {
        schedule: dto.schedule ?? group.schedule,
        timezone: dto.timezone ?? group.timezone,
      });
    }
    const changes: UpdateGroupDto = { ...dto, ...(dto.name === undefined ? {} : { name: dto.name.trim() }) };
    await this.groupModel.updateOne({ _id: group._id }, { $set: changes }).exec();
    return this.state.syncReadiness(group._id);
  }

  async remove(actor: AcademicsActor, id: string) {
    const group = await this.state.loadInOrg(actor, id);
    if (group.status !== GroupStatus.FORMING && group.status !== GroupStatus.CANCELLED) {
      throw new ConflictException(AcademicsErrors.GROUP_DELETE_NOT_ALLOWED);
    }
    await this.groupModel.updateOne({ _id: group._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }

  async markReady(actor: AcademicsActor, id: string): Promise<GroupView> {
    const group = await this.state.loadInOrg(actor, id);
    const error = checkStatusTransition(group.status, GroupStatus.READY_TO_START, { ready: computeReadiness(group).ready });
    if (error) throw new ConflictException(error);
    if (group.status === GroupStatus.READY_TO_START) return this.state.toView(group);
    await this.groupModel
      .updateOne(
        { _id: group._id, status: GroupStatus.FORMING },
        {
          $set: { status: GroupStatus.READY_TO_START },
          $push: { statusHistory: { from: GroupStatus.FORMING, to: GroupStatus.READY_TO_START, by: oid(actor._id), at: new Date() } },
        }
      )
      .exec();
    return this.state.syncReadiness(group._id);
  }

  async cancel(actor: AcademicsActor, id: string, reason: string): Promise<GroupView> {
    const group = await this.state.loadInOrg(actor, id);
    const error = checkStatusTransition(group.status, GroupStatus.CANCELLED, { ready: false, reason });
    if (error === AcademicsErrors.CANCEL_REASON_REQUIRED) throw new BadRequestException(error);
    if (error) throw new ConflictException(error);
    const now = new Date();
    await this.groupModel
      .updateOne(
        { _id: group._id, status: group.status },
        {
          $set: { status: GroupStatus.CANCELLED },
          $push: { statusHistory: { from: group.status, to: GroupStatus.CANCELLED, by: oid(actor._id), at: now, reason: reason.trim() } },
        }
      )
      .exec();
    await this.taskClosing.closeAll(group._id, TaskClosedReason.GROUP_CANCELLED, now);
    return this.state.syncReadiness(group._id);
  }

  async setContentSent(actor: AcademicsActor, id: string, done: boolean): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const contentSent = done ? { done: true, by: oid(actor._id), at: new Date() } : { done: false };
    await this.groupModel.updateOne({ _id: group._id }, { $set: { contentSent } }).exec();
    return this.state.syncReadiness(group._id);
  }
}
