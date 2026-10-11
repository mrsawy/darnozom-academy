import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AvailabilitySlot, GroupStatus, hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES, Roles } from '@darnozom/shared-types';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { checkTeacherFit } from '../domain/teacher-fit';
import { isValidAvailability } from '../domain/time';
import { Group } from '../group/entities/group.entity';
import { PutAvailabilityDto } from './dto/teacher-availability.dto';
import { TeacherAvailability } from './entities/teacher-availability.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

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
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>
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
    if (!isValidAvailability(dto.slots)) throw new BadRequestException(AcademicsErrors.INVALID_AVAILABILITY);

    const groups = await this.groupModel
      .find({ teacherId: oid(actor._id), status: { $ne: GroupStatus.CANCELLED }, deletedAt: null })
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
            availability: { timezone: dto.timezone, slots: dto.slots },
            otherGroups: [],
          }).ok
      );
      if (uncovered.length > 0) {
        throw new ConflictException(`${AcademicsErrors.AVAILABILITY_CONFLICTS_WITH_GROUPS}|${uncovered.map((g) => g.name).join(', ')}`);
      }
    }

    const saved = await this.availabilityModel
      .findOneAndUpdate(
        { teacherId: oid(actor._id) },
        { $set: { organizationId: oid(actor.organizationId), timezone: dto.timezone, slots: dto.slots } },
        { upsert: true, new: true, runValidators: true }
      )
      .lean()
      .exec();
    return this.toView(actor._id, saved);
  }
}
