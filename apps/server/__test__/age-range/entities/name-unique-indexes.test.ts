import { AgeRangeSchema } from '../../../src/age-range/entities/age-range.entity';

function findSingleFieldIndex(field: string) {
  return AgeRangeSchema.indexes().find(([fields]) => {
    const keys = Object.keys(fields);
    return keys.length === 1 && (fields as Record<string, number>)[field] === 1;
  });
}

describe('AgeRange name unique indexes', () => {
  it('does not mark nameEn/nameAr unique on the path', () => {
    expect(AgeRangeSchema.path('nameEn')?.options?.unique).toBeFalsy();
    expect(AgeRangeSchema.path('nameAr')?.options?.unique).toBeFalsy();
  });

  it.each([
    ['nameEn', 'nameEn_unique_if_not_deleted'],
    ['nameAr', 'nameAr_unique_if_not_deleted'],
  ] as const)('enforces %s uniqueness only when deletedAt is null', (field, name) => {
    const found = findSingleFieldIndex(field);
    expect(found).toBeDefined();
    const [, options] = found!;
    expect(options.unique).toBe(true);
    expect(options.partialFilterExpression).toEqual({ deletedAt: null });
    expect(options.name).toBe(name);
  });
});
