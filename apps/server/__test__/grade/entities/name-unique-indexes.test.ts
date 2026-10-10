import { GradeSchema } from '../../../src/grade/entities/grade.entity';
import { SchoolTypeSchema } from '../../../src/school-type/entities/school-type.entity';

function findSingleFieldIndex(schema: typeof GradeSchema | typeof SchoolTypeSchema, field: string) {
  return schema.indexes().find(([fields]) => {
    const keys = Object.keys(fields);
    return keys.length === 1 && (fields as Record<string, number>)[field] === 1;
  });
}

describe.each([
  ['Grade', GradeSchema],
  ['SchoolType', SchoolTypeSchema],
] as const)('%s name unique indexes', (label, schema) => {
  it(`${label} does not mark nameEn/nameAr unique on the path`, () => {
    expect(schema.path('nameEn')?.options?.unique).toBeFalsy();
    expect(schema.path('nameAr')?.options?.unique).toBeFalsy();
  });

  it.each([
    ['nameEn', 'nameEn_unique_if_not_deleted'],
    ['nameAr', 'nameAr_unique_if_not_deleted'],
  ] as const)('enforces %s uniqueness only when deletedAt is null', (field, name) => {
    const found = findSingleFieldIndex(schema, field);
    expect(found).toBeDefined();
    const [, options] = found!;
    expect(options.unique).toBe(true);
    expect(options.partialFilterExpression).toEqual({ deletedAt: null });
    expect(options.name).toBe(name);
  });
});
