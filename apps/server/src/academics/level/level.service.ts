import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages, AgeRangeErrors } from '@darnozom/shared-types';
import { TrainingCourse } from 'src/academics/training-course/entities/training-course.entity';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { AgeRange } from 'src/age-range/entities/age-range.entity';
import { Cohort } from '../cohort/entities/cohort.entity';
import { CreateLevelDto, UpdateLevelDto } from './dto/level.dto';
import { Level } from './entities/level.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class LevelService {
  constructor(
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(TrainingCourse.name) private readonly courseModel: Model<TrainingCourse>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(AgeRange.name) private readonly ageRangeModel: Model<AgeRange>
  ) {}

  private async assertAgeRangeExists(ageRangeId?: string | null) {
    if (!ageRangeId) return;
    const exists = await this.ageRangeModel.exists(withNotDeletedFilter({ _id: oid(ageRangeId) }));
    if (!exists) throw new BadRequestException(AgeRangeErrors.AGE_RANGE_NOT_FOUND);
  }

  /** Attaches the level's age range (name + bounds) so clients never resolve it themselves. */
  private async withAgeRanges<T extends { ageRangeId?: Types.ObjectId | null }>(levels: T[]) {
    const ids = [...new Set(levels.map((l) => (l.ageRangeId ? String(l.ageRangeId) : null)).filter((id): id is string => id !== null))];
    const ranges = ids.length
      ? await this.ageRangeModel.find(withNotDeletedFilter({ _id: { $in: ids.map((id) => oid(id)) } })).select('nameEn nameAr minAge maxAge').lean().exec()
      : [];
    const byId = new Map(ranges.map((r) => [String(r._id), r]));
    return levels.map((level) => ({ ...level, ageRange: level.ageRangeId ? (byId.get(String(level.ageRangeId)) ?? null) : null }));
  }

  private async assertOrderFree(courseId: Types.ObjectId, order: number, excludeId?: string) {
    const filter: FilterQuery<Level> = withNotDeletedFilter({ courseId, order });
    if (excludeId) filter._id = { $ne: oid(excludeId) };
    const existing = await this.levelModel.findOne(filter).lean().exec();
    if (existing) throw new ConflictException(AcademicsErrors.LEVEL_ORDER_ALREADY_EXISTS);
  }

  async findAll(actor: AcademicsActor, courseId: string) {
    const levels = await (
      this.levelModel
        .find(withNotDeletedFilter({ organizationId: oid(actor.organizationId), courseId: oid(courseId) }))
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ order: 1 })
        .lean()
        .exec()
    );
    return this.withAgeRanges(levels);
  }

  async findOne(actor: AcademicsActor, id: string) {
    const level = await this.levelModel.findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) })).lean().exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);
    return level;
  }

  async create(actor: AcademicsActor, dto: CreateLevelDto) {
    const course = await this.courseModel
      .findOne({ _id: oid(dto.courseId), organizationId: oid(actor.organizationId), deletedAt: null })
      .select('_id')
      .lean()
      .exec();
    if (!course) throw new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION);
    await this.assertOrderFree(oid(dto.courseId), dto.order);
    await this.assertAgeRangeExists(dto.ageRangeId);
    const created = await this.levelModel.create({
      organizationId: oid(actor.organizationId),
      courseId: oid(dto.courseId),
      name: dto.name.trim(),
      order: dto.order,
      ageRangeId: dto.ageRangeId ? oid(dto.ageRangeId) : null,
      certificateRules: dto.certificateRules,
    });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateLevelDto) {
    const level = await this.findOne(actor, id);
    if (dto.order !== undefined) await this.assertOrderFree(level.courseId, dto.order, id);
    await this.assertAgeRangeExists(dto.ageRangeId);
    const { ageRangeId, ...rest } = dto;
    const changes = {
      ...rest,
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(ageRangeId === undefined ? {} : { ageRangeId: ageRangeId === null ? null : oid(ageRangeId) }),
    };
    return this.levelModel.findOneAndUpdate({ _id: level._id }, { $set: changes }, { new: true, runValidators: true }).lean().exec();
  }

  async remove(actor: AcademicsActor, id: string) {
    const level = await this.findOne(actor, id);
    const cohorts = await this.cohortModel.countDocuments({ levelId: level._id, deletedAt: null }).exec();
    if (cohorts > 0) throw new ConflictException(AcademicsErrors.HAS_DEPENDENTS);
    await this.levelModel.updateOne({ _id: level._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }
}
