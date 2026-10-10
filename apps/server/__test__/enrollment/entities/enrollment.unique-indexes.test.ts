import { EnrollmentSchema } from '../../../src/enrollment/entities/enrollment.entity';

describe('EnrollmentSchema unique indexes', () => {
  it('enforces (userId, courseId) uniqueness only when deletedAt is null', () => {
    const found = EnrollmentSchema.indexes().find(([fields]) => fields.userId === 1 && fields.courseId === 1);
    expect(found).toBeDefined();
    const [, options] = found!;
    expect(options.unique).toBe(true);
    expect(options.partialFilterExpression).toEqual({ deletedAt: null });
    expect(options.name).toBe('userId_courseId_unique_if_not_deleted');
  });
});
