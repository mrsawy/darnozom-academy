import { buildInstructorMatch, normalizeIds } from './instructor-filter.util';

describe('normalizeIds', () => {
  it('returns [] for undefined/null', () => {
    expect(normalizeIds()).toEqual([]);
    expect(normalizeIds(null as unknown as undefined)).toEqual([]);
  });

  it('wraps a scalar into an array', () => {
    expect(normalizeIds('abc')).toEqual(['abc']);
  });

  it('splits CSV strings and trims', () => {
    expect(normalizeIds('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty entries from arrays', () => {
    expect(normalizeIds(['a', '', ' ', 'b'])).toEqual(['a', 'b']);
  });
});

describe('buildInstructorMatch', () => {
  it('is empty when no filters are supplied', () => {
    expect(buildInstructorMatch({})).toEqual({});
  });

  it('builds an escaped $or search across name/email/username', () => {
    const match = buildInstructorMatch({ search: 'a.b*c' });
    const or = (match.$or as { firstName?: { $regex: string } }[]) ?? [];
    expect(or).toHaveLength(4);
    // Regex metacharacters must be escaped so the term is matched literally.
    expect(or[0].firstName?.$regex).toBe(String.raw`a\.b\*c`);
  });

  it('ignores blank search', () => {
    expect(buildInstructorMatch({ search: '   ' })).toEqual({});
  });

  it('applies minRating as $gte only when > 0', () => {
    expect(buildInstructorMatch({ minRating: 4 })).toEqual({ averageCoursesRating: { $gte: 4 } });
    expect(buildInstructorMatch({ minRating: 0 })).toEqual({});
  });

  it('applies $in for category/grade/school-type ids', () => {
    const match = buildInstructorMatch({
      categoryIds: ['c1', 'c2'],
      gradeIds: 'g1',
      schoolTypeIds: 's1,s2',
    });
    expect(match.categoriesIds).toEqual({ $in: ['c1', 'c2'] });
    expect(match.gradesIds).toEqual({ $in: ['g1'] });
    expect(match.schoolTypesIds).toEqual({ $in: ['s1', 's2'] });
  });

  it('omits id filters when the list is empty', () => {
    expect(buildInstructorMatch({ categoryIds: [], gradeIds: '' })).toEqual({});
  });

  it('combines multiple filters into one match (intersection semantics)', () => {
    const match = buildInstructorMatch({ search: 'ali', minRating: 3, gradeIds: ['g1'] });
    expect(match.$or).toBeDefined();
    expect(match.averageCoursesRating).toEqual({ $gte: 3 });
    expect(match.gradesIds).toEqual({ $in: ['g1'] });
  });
});
