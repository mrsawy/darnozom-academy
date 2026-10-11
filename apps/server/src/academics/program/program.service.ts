import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AcademicsErrors, AcademicsSuccessMessages } from '@darnozom/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';
import { AcademicsActor } from '../common/actor';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { Program } from './entities/program.entity';

const oid = (id: string) => new Types.ObjectId(id);

@Injectable()
export class ProgramService {
  constructor(
    @InjectModel(Program.name) private readonly programModel: Model<Program>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>
  ) {}

  private async assertNameAvailable(actor: AcademicsActor, name: string, excludeId?: string) {
    const filter: FilterQuery<Program> = withNotDeletedFilter({ organizationId: oid(actor.organizationId), name });
    if (excludeId) filter._id = { $ne: oid(excludeId) };
    const existing = await this.programModel.findOne(filter).lean().exec();
    if (existing) throw new ConflictException(AcademicsErrors.PROGRAM_NAME_ALREADY_EXISTS);
  }

  async findAll(actor: AcademicsActor) {
    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.programModel.find(withNotDeletedFilter({ organizationId: oid(actor.organizationId) })).sort({ name: 1 }).lean().exec();
  }

  async findOne(actor: AcademicsActor, id: string) {
    const program = await this.programModel
      .findOne(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) }))
      .lean()
      .exec();
    if (!program) throw new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND);
    return program;
  }

  async create(actor: AcademicsActor, dto: CreateProgramDto) {
    const name = dto.name.trim();
    await this.assertNameAvailable(actor, name);
    const created = await this.programModel.create({ ...dto, name, organizationId: oid(actor.organizationId) });
    return created.toObject();
  }

  async update(actor: AcademicsActor, id: string, dto: UpdateProgramDto) {
    const changes: UpdateProgramDto = { ...dto };
    if (changes.name !== undefined) {
      changes.name = changes.name.trim();
      await this.assertNameAvailable(actor, changes.name, id);
    }
    const updated = await this.programModel
      .findOneAndUpdate(withNotDeletedFilter({ _id: oid(id), organizationId: oid(actor.organizationId) }), { $set: changes }, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND);
    return updated;
  }

  async remove(actor: AcademicsActor, id: string) {
    const program = await this.findOne(actor, id);
    const courses = await this.courseModel.countDocuments({ programId: program._id, deletedAt: null }).exec();
    if (courses > 0) throw new ConflictException(AcademicsErrors.HAS_DEPENDENTS);
    await this.programModel.updateOne({ _id: program._id }, { $set: buildSoftDeleteSet(actor._id) }).exec();
    return { message: AcademicsSuccessMessages.DELETED };
  }

  async findCourses(actor: AcademicsActor, programId: string) {
    const program = await this.findOne(actor, programId);
    return this.courseModel
      .find({ organizationId: oid(actor.organizationId), programId: program._id, deletedAt: null })
      .select('_id name programId')
      .lean()
      .exec();
  }

  async courseOptions(actor: AcademicsActor) {
    return (
      this.courseModel
        .find({ organizationId: oid(actor.organizationId), deletedAt: null })
        .select('_id name programId')
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
        .sort({ name: 1 })
        .lean()
        .exec()
    );
  }

  private async findCourseInOrg(actor: AcademicsActor, courseId: string) {
    const course = await this.courseModel
      .findOne({ _id: oid(courseId), organizationId: oid(actor.organizationId), deletedAt: null })
      .select('_id')
      .lean()
      .exec();
    if (!course) throw new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION);
    return course;
  }

  async linkCourse(actor: AcademicsActor, programId: string, courseId: string) {
    const program = await this.findOne(actor, programId);
    const course = await this.findCourseInOrg(actor, courseId);
    await this.courseModel.updateOne({ _id: course._id }, { $set: { programId: program._id } }).exec();
    return { programId, courseId };
  }

  async unlinkCourse(actor: AcademicsActor, courseId: string) {
    const course = await this.findCourseInOrg(actor, courseId);
    await this.courseModel.updateOne({ _id: course._id }, { $set: { programId: null } }).exec();
    return { courseId };
  }
}
