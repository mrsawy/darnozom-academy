import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Cohort } from '../cohort/entities/cohort.entity';
import { CreateLevelDto, UpdateLevelDto } from './dto/level.dto';
import { Level } from './entities/level.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class LevelService {
  constructor(
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>
  ) {}

  private async assertOrderFree(courseId: Types.ObjectId, order: number, excludeId?: string) {
    const filter: FilterQuery<Level> = withNotDeletedFilter({ courseId, order });
    if (excludeId) filter._id = { $ne: oid(excludeId) };
    const existing = await this.levelModel.findOne(filter).lean().exec();
    if (existing) throw new ConflictException(AcademicsErrors.LEVEL_ORDER_ALREADY_EXISTS);
  }

  async findAll(actor: AcademicsActor, courseId: string) {
    return (
      this.levelModel
        .find(withNotDeletedFilter({ organizationId: oid(actor.organizationId), courseId: oid(courseId) }))
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ order: 1 })
        .lean()
        .exec()
    );
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
    const created = await this.levelModel.create({
      organizationId: oid(actor.organizationId),
      courseId: oid(dto.courseId),
      name: dto.name.trim(),
      order: dto.order,
    });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateLevelDto) {
    const level = await this.findOne(actor, id);
    if (dto.order !== undefined) await this.assertOrderFree(level.courseId, dto.order, id);
    const changes: UpdateLevelDto = { ...dto, ...(dto.name === undefined ? {} : { name: dto.name.trim() }) };
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
