import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages } from '@darnozom/shared-types';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { Group } from '../group/entities/group.entity';
import { GroupTeacherService } from '../group/group-teacher.service';
import { Level } from '../level/entities/level.entity';
import { CreateCohortDto, UpdateCohortDto } from './dto/cohort.dto';
import { Cohort } from './entities/cohort.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class CohortService {
  constructor(
    @InjectModel(Cohort.name) private readonly cohortModel: Model<Cohort>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly groupTeacher: GroupTeacherService
  ) {}

  async findAll(actor: AcademicsActor, levelId: string) {
    return (
      this.cohortModel
        .find(withNotDeletedFilter({ organizationId: oid(actor.organizationId), levelId: oid(levelId) }))
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ startDate: -1 })
        .lean()
        .exec()
    );
  }

  async findOne(actor: AcademicsActor, id: string) {
    const cohort = await this.cohortModel.findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) })).lean().exec();
    if (!cohort) throw new NotFoundException(AcademicsErrors.COHORT_NOT_FOUND);
    return cohort;
  }

  async create(actor: AcademicsActor, dto: CreateCohortDto) {
    const level = await this.levelModel
      .findOne(withNotDeletedFilter({ _id: oid(dto.levelId), organizationId: oid(actor.organizationId) }))
      .select('_id')
      .lean()
      .exec();
    if (!level) throw new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND);
    const created = await this.cohortModel.create({
      organizationId: oid(actor.organizationId),
      levelId: oid(dto.levelId),
      name: dto.name.trim(),
      startDate: new Date(dto.startDate),
    });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateCohortDto) {
    const cohort = await this.findOne(actor, id);
    const changes: { name?: string; startDate?: Date } = {};
    if (dto.name !== undefined) changes.name = dto.name.trim();
    if (dto.startDate !== undefined) {
      changes.startDate = new Date(dto.startDate);
      await this.groupTeacher.assertCohortStartDateFits(actor, cohort._id, changes.startDate);
    }
    return this.cohortModel.findOneAndUpdate({ _id: cohort._id }, { $set: changes }, { new: true, runValidators: true }).lean().exec();
  }

  async remove(actor: AcademicsActor, id: string) {
    const cohort = await this.findOne(actor, id);
    const groups = await this.groupModel.countDocuments({ cohortId: cohort._id, deletedAt: null }).exec();
    if (groups > 0) throw new ConflictException(AcademicsErrors.HAS_DEPENDENTS);
    await this.cohortModel.updateOne({ _id: cohort._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }
}
