import { Model } from 'mongoose';
import { Grade } from '../entities/grade.entity';
import { GRADE_SEED_DEFINITIONS } from './grade.config';

export class GradeSeeder {
  constructor(private readonly gradeModel: Model<Grade>) {}

  async seed() {
    for (const grade of GRADE_SEED_DEFINITIONS) {
      await this.gradeModel.findOneAndUpdate({ nameEn: grade.nameEn }, grade, {
        upsert: true,
        new: true,
      });
    }
  }
}
