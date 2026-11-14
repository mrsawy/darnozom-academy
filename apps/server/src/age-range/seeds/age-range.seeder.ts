import { Model } from 'mongoose';
import { AgeRange } from '../entities/age-range.entity';
import { AGE_RANGE_SEED_DEFINITIONS } from './age-range.config';

export class AgeRangeSeeder {
  constructor(private readonly ageRangeModel: Model<AgeRange>) {}

  async seed() {
    for (const ageRange of AGE_RANGE_SEED_DEFINITIONS) {
      await this.ageRangeModel.findOneAndUpdate({ nameEn: ageRange.nameEn }, ageRange, {
        upsert: true,
        new: true,
      });
    }
  }
}
