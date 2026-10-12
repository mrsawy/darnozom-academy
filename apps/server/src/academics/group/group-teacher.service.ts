import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AvailabilitySlot, GroupStatus, hasRole, Roles, ScheduleSlot, TeacherFitReason } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { checkTeacherFit, TeacherFitResult } from '../domain/teacher-fit';
import { TeacherAvailability } from '../teacher-availability/entities/teacher-availability.entity';
import { Group } from './entities/group.entity';
import { GroupStateService } from './group-state.service';
import { GroupLean, GroupView } from './group.types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));
const TEACHER_FIELDS = '_id firstName lastName roleName additionalRoles';

interface TeacherLean {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  roleName: Roles;
  additionalRoles?: Roles[];
}

type FitGroup = Pick<GroupLean, 'schedule' | 'timezone' | 'cohortId'> & { _id?: Types.ObjectId };

@Injectable()
export class GroupTeacherService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(TeacherAvailability.name) private readonly availabilityModel: Model<TeacherAvailability>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    private readonly state: GroupStateService
  ) {}

  private async referenceDateFor(cohortId: Types.ObjectId): Promise<Date> {
    const cohort = await this.cohortModel.findOne({ _id: cohortId }).select('startDate').lean<{ startDate: Date }>().exec();
    return cohort?.startDate ?? new Date();
  }

  async evaluateFit(group: FitGroup, teacher: TeacherLean, referenceDate?: Date): Promise<TeacherFitResult> {
    const [availability, others, reference] = await Promise.all([
      this.availabilityModel.findOne({ teacherId: teacher._id }).lean<{ timezone: string; slots: AvailabilitySlot[] }>().exec(),
      this.groupModel
        .find({ teacherId: teacher._id, status: { $ne: GroupStatus.CANCELLED }, deletedAt: null, ...(group._id ? { _id: { $ne: group._id } } : {}) })
        .select('_id name schedule timezone')
        .lean<{ _id: Types.ObjectId; name: string; schedule: ScheduleSlot[]; timezone: string }[]>()
        .exec(),
      referenceDate ? Promise.resolve(referenceDate) : this.referenceDateFor(group.cohortId),
    ]);
    return checkTeacherFit({
      isInstructor: hasRole(teacher, Roles.INSTRUCTOR),
      groupSchedule: group.schedule,
      groupTimezone: group.timezone,
      referenceDate: reference,
      availability: availability ? { timezone: availability.timezone, slots: availability.slots } : null,
      otherGroups: others.map((o) => ({ _id: String(o._id), name: o.name, timezone: o.timezone, schedule: o.schedule })),
    });
  }

  private async loadTeacher(actor: AcademicsActor, teacherId: string): Promise<TeacherLean> {
    const teacher = await this.userModel
      .findOne({ _id: oid(teacherId), organizationId: oid(actor.organizationId), deletedAt: null })
      .select(TEACHER_FIELDS)
      .lean<TeacherLean>()
      .exec();
    if (!teacher) throw new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION);
    return teacher;
  }

  async assign(actor: AcademicsActor, id: string, teacherId: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    const teacher = await this.loadTeacher(actor, teacherId);
    const fit = await this.evaluateFit(group, teacher);
    if (!fit.ok) throw new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);
    await this.groupModel.updateOne({ _id: group._id }, { $set: { teacherId: teacher._id } }).exec();
    return this.state.syncReadiness(group._id);
  }

  async unassign(actor: AcademicsActor, id: string): Promise<GroupView> {
    const group = await this.state.loadForWrite(actor, id);
    await this.groupModel.updateOne({ _id: group._id }, { $set: { teacherId: null } }).exec();
    return this.state.syncReadiness(group._id);
  }

  async candidates(actor: AcademicsActor, id: string): Promise<{ teacherId: string; name: string; ok: boolean; reasons: TeacherFitReason[] }[]> {
    const group = await this.state.loadInOrg(actor, id);
    const [teachers, reference] = await Promise.all([
      this.userModel
        .find({ organizationId: oid(actor.organizationId), deletedAt: null, $or: [{ roleName: Roles.INSTRUCTOR }, { additionalRoles: Roles.INSTRUCTOR }] })
        .select(TEACHER_FIELDS)
        .lean<TeacherLean[]>()
        .exec(),
      this.referenceDateFor(group.cohortId),
    ]);
    return Promise.all(
      teachers.map(async (teacher) => {
        const fit = await this.evaluateFit(group, teacher, reference);
        return { teacherId: String(teacher._id), name: `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim(), ok: fit.ok, reasons: fit.reasons };
      })
    );
  }

  async assertScheduleChangeFits(actor: AcademicsActor, group: GroupLean, next: { schedule: ScheduleSlot[]; timezone: string }): Promise<void> {
    if (!group.teacherId) return;
    const teacher = await this.userModel.findOne({ _id: group.teacherId }).select(TEACHER_FIELDS).lean<TeacherLean>().exec();
    if (!teacher) return;
    const fit = await this.evaluateFit({ ...group, ...next }, teacher);
    if (!fit.ok) throw new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);
  }

  async assertCohortStartDateFits(actor: AcademicsActor, cohortId: Types.ObjectId, startDate: Date): Promise<void> {
    const groups = await this.groupModel
      .find({ cohortId, teacherId: { $ne: null }, status: { $ne: GroupStatus.CANCELLED }, deletedAt: null })
      .select('_id cohortId schedule timezone teacherId')
      .lean<GroupLean[]>()
      .exec();
    for (const group of groups) {
      const teacher = await this.userModel.findOne({ _id: group.teacherId }).select(TEACHER_FIELDS).lean<TeacherLean>().exec();
      if (!teacher) continue;
      const fit = await this.evaluateFit(group, teacher, startDate);
      if (!fit.ok) throw new ConflictException(AcademicsErrors.TEACHER_NOT_ASSIGNABLE);
    }
  }
}
