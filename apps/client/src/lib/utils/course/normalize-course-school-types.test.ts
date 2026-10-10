import { describe, expect, it } from 'vitest';
import { normalizeCourseSchoolTypes } from './normalize-course-school-types';

const stA = { _id: 'a', nameEn: 'A', nameAr: 'أ' };
const stB = { _id: 'b', nameEn: 'B', nameAr: 'ب' };

describe('normalizeCourseSchoolTypes', () => {
  it('returns empty arrays when missing', () => {
    expect(normalizeCourseSchoolTypes({})).toEqual({ schoolTypeIds: [], schoolTypes: [] });
  });

  it('prefers plural fields', () => {
    expect(
      normalizeCourseSchoolTypes({
        schoolTypeIds: ['a', 'b'],
        schoolTypes: [stA, stB],
        schoolTypeId: 'legacy',
        schoolType: stA,
      })
    ).toEqual({ schoolTypeIds: ['a', 'b'], schoolTypes: [stA, stB] });
  });

  it('wraps singular id and object', () => {
    expect(
      normalizeCourseSchoolTypes({
        schoolTypeId: 'a',
        schoolType: stA,
      })
    ).toEqual({ schoolTypeIds: ['a'], schoolTypes: [stA] });
  });

  it('derives ids from populated singular when ids missing', () => {
    expect(normalizeCourseSchoolTypes({ schoolType: stA })).toEqual({
      schoolTypeIds: ['a'],
      schoolTypes: [stA],
    });
  });

  it('handles plural ids without populated types', () => {
    expect(normalizeCourseSchoolTypes({ schoolTypeIds: ['a'] })).toEqual({
      schoolTypeIds: ['a'],
      schoolTypes: [],
    });
  });
});
