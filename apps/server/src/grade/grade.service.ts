import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { GradeErrors, GradeSuccessMessages } from '@darnozom/shared-types';
import { Grade } from './entities/grade.entity';
import { Course } from '../course/entities/course.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';

@Injectable()
export class GradeService {
  constructor(
    @InjectModel(Grade.name) private readonly gradeModel: Model<Grade>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>
  ) {}

  private async assertNameAvailable(nameEn?: string, nameAr?: string, excludeId?: string) {
    const orConditions: mongoose.FilterQuery<Grade>[] = [];
    if (nameEn) orConditions.push({ nameEn });
    if (nameAr) orConditions.push({ nameAr });
    if (orConditions.length === 0) return;

    const filter: mongoose.FilterQuery<Grade> = withNotDeletedFilter({ $or: orConditions });
    if (excludeId) filter._id = { $ne: excludeId };

    const existing = await this.gradeModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(GradeErrors.GRADE_NAME_ALREADY_EXISTS);
    }
  }

  async create(createGradeDto: CreateGradeDto, createdBy?: string) {
    await this.assertNameAvailable(createGradeDto.nameEn, createGradeDto.nameAr);
    const grade = await this.gradeModel.create({
      ...createGradeDto,
      ...(createdBy ? { createdBy: new mongoose.Types.ObjectId(createdBy) } : {}),
    });
    return grade;
  }

  async findAll() {
    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.gradeModel.find(withNotDeletedFilter({})).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const grade = await this.gradeModel.findOne(withNotDeletedFilter({ _id: id })).exec();
    if (!grade) {
      throw new NotFoundException(GradeErrors.GRADE_NOT_FOUND);
    }
    return grade;
  }

  async update(id: string, updateGradeDto: UpdateGradeDto) {
    await this.assertNameAvailable(updateGradeDto.nameEn, updateGradeDto.nameAr, id);
    const updated = await this.gradeModel
      .findOneAndUpdate(withNotDeletedFilter({ _id: id }), updateGradeDto, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(GradeErrors.GRADE_NOT_FOUND);
    }
    return updated;
  }

  async remove(id: string, deletedById?: string | Types.ObjectId | null) {
    const grade = await this.gradeModel.findOne(withNotDeletedFilter({ _id: id })).exec();
    if (!grade) {
      throw new NotFoundException(GradeErrors.GRADE_NOT_FOUND);
    }

    const referencingCourses = await this.courseModel.countDocuments({ gradeId: grade._id });
    if (referencingCourses > 0) {
      throw new ConflictException(GradeErrors.GRADE_IN_USE_CANNOT_DELETE);
    }

    await this.gradeModel.updateOne(withNotDeletedFilter({ _id: grade._id }), {
      $set: buildSoftDeleteSet(deletedById),
    });
    return { message: GradeSuccessMessages.GRADE_DELETED };
  }
}
