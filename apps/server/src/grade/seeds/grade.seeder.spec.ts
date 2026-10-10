import { Model } from 'mongoose';
import { Grade } from '../entities/grade.entity';
import { GradeSeeder } from './grade.seeder';
import { GRADE_SEED_DEFINITIONS } from './grade.config';

describe('GradeSeeder', () => {
  const findOneAndUpdate = jest.fn();
  const gradeModel = { findOneAndUpdate } as unknown as Model<Grade>;
  let seeder: GradeSeeder;

  beforeEach(() => {
    jest.clearAllMocks();
    findOneAndUpdate.mockResolvedValue({});
    seeder = new GradeSeeder(gradeModel);
  });

  it('seeds all six defined grades', async () => {
    await seeder.seed();

    expect(GRADE_SEED_DEFINITIONS).toHaveLength(6);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(GRADE_SEED_DEFINITIONS.length);
  });

  it('upserts each grade by English name so repeated runs stay idempotent', async () => {
    await seeder.seed();

    for (const grade of GRADE_SEED_DEFINITIONS) {
      expect(findOneAndUpdate).toHaveBeenCalledWith({ nameEn: grade.nameEn }, grade, expect.objectContaining({ upsert: true }));
    }
  });

  it('does not create duplicates when run twice', async () => {
    await seeder.seed();
    await seeder.seed();

    // Every call is an idempotent upsert keyed by nameEn; no plain create is used.
    expect(findOneAndUpdate).toHaveBeenCalledTimes(GRADE_SEED_DEFINITIONS.length * 2);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { nameEn: '1st Preparatory' },
      { nameEn: '1st Preparatory', nameAr: 'الصف الأول الإعدادي' },
      expect.objectContaining({ upsert: true })
    );
  });
});
