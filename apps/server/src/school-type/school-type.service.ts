import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { SchoolTypeErrors, SchoolTypeSuccessMessages } from '@lms-organization/shared-types';
import { SchoolType } from './entities/school-type.entity';
import { Course } from '../course/entities/course.entity';
import { CreateSchoolTypeDto } from './dto/create-school-type.dto';
import { UpdateSchoolTypeDto } from './dto/update-school-type.dto';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';

@Injectable()
export class SchoolTypeService {
  constructor(
    @InjectModel(SchoolType.name) private readonly schoolTypeModel: Model<SchoolType>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>
  ) {}

  private async assertNameAvailable(nameEn?: string, nameAr?: string, excludeId?: string) {
    const orConditions: mongoose.FilterQuery<SchoolType>[] = [];
    if (nameEn) orConditions.push({ nameEn });
    if (nameAr) orConditions.push({ nameAr });
    if (orConditions.length === 0) return;

    const filter: mongoose.FilterQuery<SchoolType> = withNotDeletedFilter({ $or: orConditions });
    if (excludeId) filter._id = { $ne: excludeId };

    const existing = await this.schoolTypeModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(SchoolTypeErrors.SCHOOL_TYPE_NAME_ALREADY_EXISTS);
    }
  }

  async create(createSchoolTypeDto: CreateSchoolTypeDto, createdBy?: string) {
    await this.assertNameAvailable(createSchoolTypeDto.nameEn, createSchoolTypeDto.nameAr);
    const schoolType = await this.schoolTypeModel.create({
      ...createSchoolTypeDto,
      ...(createdBy ? { createdBy: new mongoose.Types.ObjectId(createdBy) } : {}),
    });
    return schoolType;
  }

  async findAll() {
    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.schoolTypeModel.find(withNotDeletedFilter({})).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const schoolType = await this.schoolTypeModel.findOne(withNotDeletedFilter({ _id: id })).exec();
    if (!schoolType) {
      throw new NotFoundException(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
    }
    return schoolType;
  }

  async update(id: string, updateSchoolTypeDto: UpdateSchoolTypeDto) {
    await this.assertNameAvailable(updateSchoolTypeDto.nameEn, updateSchoolTypeDto.nameAr, id);
    const updated = await this.schoolTypeModel
      .findOneAndUpdate(withNotDeletedFilter({ _id: id }), updateSchoolTypeDto, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
    }
    return updated;
  }

  async remove(id: string, deletedById?: string | Types.ObjectId | null) {
    const schoolType = await this.schoolTypeModel.findOne(withNotDeletedFilter({ _id: id })).exec();
    if (!schoolType) {
      throw new NotFoundException(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
    }

    const referencingCourses = await this.courseModel.countDocuments({ schoolTypeIds: schoolType._id });
    if (referencingCourses > 0) {
      throw new ConflictException(SchoolTypeErrors.SCHOOL_TYPE_IN_USE_CANNOT_DELETE);
    }

    await this.schoolTypeModel.updateOne(withNotDeletedFilter({ _id: schoolType._id }), {
      $set: buildSoftDeleteSet(deletedById),
    });
    return { message: SchoolTypeSuccessMessages.SCHOOL_TYPE_DELETED };
  }
}
