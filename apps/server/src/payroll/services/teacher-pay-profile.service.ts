import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PayrollErrors, TeacherPayModel } from '@darnozom/shared-types';
import { TeacherPayProfile, TeacherPayProfileDocument } from '../entities/teacher-pay-profile.entity';
import { UpsertTeacherPayProfileDto } from '../dto/payroll.dto';

@Injectable()
export class TeacherPayProfileService {
  constructor(
    @InjectModel(TeacherPayProfile.name)
    private readonly profileModel: Model<TeacherPayProfileDocument>
  ) {}

  async upsertProfile(organizationId: string, teacherId: string, dto: UpsertTeacherPayProfileDto): Promise<TeacherPayProfile> {
    if (dto.rate < 0) {
      throw new BadRequestException(PayrollErrors.INVALID_PAY_RATE);
    }

    if (dto.model === TeacherPayModel.REVENUE_SHARE && dto.rate > 100) {
      throw new BadRequestException(PayrollErrors.INVALID_PAY_RATE);
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    return this.profileModel.create({
      organizationId: new Types.ObjectId(organizationId),
      teacherId: new Types.ObjectId(teacherId),
      model: dto.model,
      rate: dto.rate,
      currency: dto.currency,
      effectiveFrom,
    });
  }

  async getProfileForTeacher(organizationId: string, teacherId: string): Promise<TeacherPayProfile> {
    const profile = await this.profileModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        teacherId: new Types.ObjectId(teacherId),
      })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort
      .sort({ effectiveFrom: -1 });

    if (!profile) {
      throw new NotFoundException(PayrollErrors.PAY_PROFILE_NOT_FOUND);
    }

    return profile;
  }

  async findEffectiveProfile(organizationId: string, teacherId: string, targetDate: Date): Promise<TeacherPayProfile | null> {
    // 1. Look for profile effective on or before targetDate (most recent first)
    const effective = await this.profileModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        teacherId: new Types.ObjectId(teacherId),
        effectiveFrom: { $lte: targetDate },
      })
      // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort
      .sort({ effectiveFrom: -1 });

    if (effective) {
      return effective;
    }

    // 2. Fallback to earliest profile if all are after targetDate
    return (
      this.profileModel
        .findOne({
          organizationId: new Types.ObjectId(organizationId),
          teacherId: new Types.ObjectId(teacherId),
        })
        // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort
        .sort({ effectiveFrom: 1 })
    );
  }

  async getProfiles(organizationId: string): Promise<TeacherPayProfile[]> {
    return this.profileModel.aggregate([
      { $match: { organizationId: new Types.ObjectId(organizationId) } },
      { $sort: { effectiveFrom: -1 } },
      {
        $group: {
          _id: '$teacherId',
          profile: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$profile' } },
    ]);
  }
}
