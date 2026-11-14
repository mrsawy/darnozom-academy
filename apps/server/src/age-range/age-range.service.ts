import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { AgeRangeErrors, AgeRangeSuccessMessages } from '@darnozom/shared-types';
import { AgeRange } from './entities/age-range.entity';
import { Course } from '../course/entities/course.entity';
import { CreateAgeRangeDto } from './dto/create-age-range.dto';
import { UpdateAgeRangeDto } from './dto/update-age-range.dto';
import { buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';

@Injectable()
export class AgeRangeService {
  constructor(
    @InjectModel(AgeRange.name) private readonly ageRangeModel: Model<AgeRange>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>
  ) {}

  private async assertNameAvailable(nameEn?: string, nameAr?: string, excludeId?: string) {
    const orConditions: mongoose.FilterQuery<AgeRange>[] = [];
    if (nameEn) orConditions.push({ nameEn });
    if (nameAr) orConditions.push({ nameAr });
    if (orConditions.length === 0) return;

    const filter: mongoose.FilterQuery<AgeRange> = withNotDeletedFilter({ $or: orConditions });
    if (excludeId) filter._id = { $ne: excludeId };

    const existing = await this.ageRangeModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(AgeRangeErrors.AGE_RANGE_NAME_ALREADY_EXISTS);
    }
  }

  private assertValidRange(minAge?: number, maxAge?: number | null) {
    if (minAge !== undefined && maxAge !== undefined && maxAge !== null && maxAge < minAge) {
      throw new BadRequestException(AgeRangeErrors.AGE_RANGE_INVALID);
    }
  }

  async create(createAgeRangeDto: CreateAgeRangeDto, createdBy?: string) {
    this.assertValidRange(createAgeRangeDto.minAge, createAgeRangeDto.maxAge);
    await this.assertNameAvailable(createAgeRangeDto.nameEn, createAgeRangeDto.nameAr);
    const ageRange = await this.ageRangeModel.create({
      ...createAgeRangeDto,
      ...(createdBy ? { createdBy: new mongoose.Types.ObjectId(createdBy) } : {}),
    });
    return ageRange;
  }

  async findAll() {
    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.ageRangeModel.find(withNotDeletedFilter({})).sort({ minAge: 1 }).exec();
  }

  async findOne(id: string) {
    const ageRange = await this.ageRangeModel.findOne(withNotDeletedFilter({ _id: id })).exec();
    if (!ageRange) {
      throw new NotFoundException(AgeRangeErrors.AGE_RANGE_NOT_FOUND);
    }
    return ageRange;
  }

  async update(id: string, updateAgeRangeDto: UpdateAgeRangeDto) {
    if (updateAgeRangeDto.minAge !== undefined || updateAgeRangeDto.maxAge !== undefined) {
      const current = await this.findOne(id);
      this.assertValidRange(
        updateAgeRangeDto.minAge ?? current.minAge,
        updateAgeRangeDto.maxAge === undefined ? current.maxAge : updateAgeRangeDto.maxAge
      );
    }
    await this.assertNameAvailable(updateAgeRangeDto.nameEn, updateAgeRangeDto.nameAr, id);
    const updated = await this.ageRangeModel
      .findOneAndUpdate(withNotDeletedFilter({ _id: id }), updateAgeRangeDto, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(AgeRangeErrors.AGE_RANGE_NOT_FOUND);
    }
    return updated;
  }

  async remove(id: string, deletedById?: string | Types.ObjectId | null) {
    const ageRange = await this.ageRangeModel.findOne(withNotDeletedFilter({ _id: id })).exec();
    if (!ageRange) {
      throw new NotFoundException(AgeRangeErrors.AGE_RANGE_NOT_FOUND);
    }

    const referencingCourses = await this.courseModel.countDocuments({ ageRangeIds: ageRange._id });
    if (referencingCourses > 0) {
      throw new ConflictException(AgeRangeErrors.AGE_RANGE_IN_USE_CANNOT_DELETE);
    }

    await this.ageRangeModel.updateOne(withNotDeletedFilter({ _id: ageRange._id }), {
      $set: buildSoftDeleteSet(deletedById),
    });
    return { message: AgeRangeSuccessMessages.AGE_RANGE_DELETED };
  }
}
