import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AvailabilitySlot, GroupStatus, hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES, Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { checkTeacherFit } from '../domain/teacher-fit';
import { isValidAvailability } from '../domain/time';
import { Group } from '../group/entities/group.entity';
import { PutAvailabilityDto, PutAvailabilityForTeacherDto } from './dto/teacher-availability.dto';
import { TeacherAvailability } from './entities/teacher-availability.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

/** Staff roles allowed to write another teacher's availability (never INSTRUCTOR — they use putMine on their own record only). */
const AVAILABILITY_ADMIN_ROLES: Roles[] = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR];

export interface AvailabilityView {
  teacherId: string;
  timezone: string | null;
  slots: AvailabilitySlot[];
}

@Injectable()
export class TeacherAvailabilityService {
  constructor(
    @InjectModel(TeacherAvailability.name) private readonly availabilityModel: Model<TeacherAvailability>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  private toView(teacherId: string, doc: { timezone: string; slots: AvailabilitySlot[] } | null): AvailabilityView {
    if (!doc) return { teacherId, timezone: null, slots: [] };
    return { teacherId, timezone: doc.timezone, slots: doc.slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })) };
  }

  async getMine(actor: AcademicsActor): Promise<AvailabilityView> {
    const doc = await this.availabilityModel.findOne({ teacherId: oid(actor._id) }).lean().exec();
    return this.toView(actor._id, doc);
  }

  async getForTeacher(actor: AcademicsActor, teacherId: string): Promise<AvailabilityView> {
    if (teacherId !== actor._id && !hasAnyRole(actor, ORG_WIDE_GROUP_READER_ROLES)) {
      throw new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION);
    }
    const doc = await this.availabilityModel.findOne({ teacherId: oid(teacherId), organizationId: oid(actor.organizationId) }).lean().exec();
    return this.toView(teacherId, doc);
  }

  async putMine(actor: AcademicsActor, dto: PutAvailabilityDto): Promise<AvailabilityView> {
    if (!hasRole(actor, Roles.INSTRUCTOR)) throw new ForbiddenException(AcademicsErrors.NOT_AN_INSTRUCTOR);
    return this.saveAvailability(actor._id, actor.organizationId, dto.timezone, dto.slots);
  }

  async putForTeacher(actor: AcademicsActor, dto: PutAvailabilityForTeacherDto): Promise<AvailabilityView> {
    if (!hasAnyRole(actor, AVAILABILITY_ADMIN_ROLES)) throw new ForbiddenException();
    const teacher = await this.userModel
      .findOne({ _id: oid(dto.teacherId), organizationId: oid(actor.organizationId) })
      .select('_id roleName')
      .lean()
      .exec();
    if (!teacher || teacher.roleName !== Roles.INSTRUCTOR) {
      throw new NotFoundException(AcademicsErrors.TEACHER_NOT_FOUND_IN_ORGANIZATION);
    }
    return this.saveAvailability(dto.teacherId, actor.organizationId, dto.timezone, dto.slots);
  }

  private async saveAvailability(
    teacherId: string,
    organizationId: string,
    timezone: string,
    slots: AvailabilitySlot[]
  ): Promise<AvailabilityView> {
    if (!isValidAvailability(slots)) throw new BadRequestException(AcademicsErrors.INVALID_AVAILABILITY);

    const groups = await this.groupModel
      .find({ teacherId: oid(teacherId), status: { $ne: GroupStatus.CANCELLED }, deletedAt: null })
      .select('_id name schedule timezone cohortId status')
      .lean()
      .exec();
    if (groups.length > 0) {
      const cohorts = await this.cohortModel
        .find({ _id: { $in: groups.map((g) => g.cohortId) } })
        .select('_id startDate')
        .lean()
        .exec();
      const startDates = new Map(cohorts.map((c) => [String(c._id), c.startDate]));
      const uncovered = groups.filter(
        (group) =>
          !checkTeacherFit({
            isInstructor: true,
            groupSchedule: group.schedule,
            groupTimezone: group.timezone,
            referenceDate: startDates.get(String(group.cohortId)) ?? new Date(),
            availability: { timezone, slots },
            otherGroups: [],
          }).ok
      );
      if (uncovered.length > 0) {
        throw new ConflictException(`${AcademicsErrors.AVAILABILITY_CONFLICTS_WITH_GROUPS}|${uncovered.map((g) => g.name).join(', ')}`);
      }
    }

    const saved = await this.availabilityModel
      .findOneAndUpdate(
        { teacherId: oid(teacherId) },
        { $set: { organizationId: oid(organizationId), timezone, slots } },
        { upsert: true, new: true, runValidators: true }
      )
      .lean()
      .exec();
    return this.toView(teacherId, saved);
  }
}
