import { Model } from 'mongoose';
import { SchoolType } from '../entities/school-type.entity';
import { SCHOOL_TYPE_SEED_DEFINITIONS } from './school-type.config';

export class SchoolTypeSeeder {
  constructor(private readonly schoolTypeModel: Model<SchoolType>) {}

  async seed() {
    for (const schoolType of SCHOOL_TYPE_SEED_DEFINITIONS) {
      await this.schoolTypeModel.findOneAndUpdate({ nameEn: schoolType.nameEn }, schoolType, {
        upsert: true,
        new: true,
      });
    }
  }
}
