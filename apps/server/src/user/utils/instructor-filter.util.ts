import { escapeRegex } from '../../utils/approval.utils';

/**
 * Flat, transport-agnostic instructor filter input. Both the HTTP and NATS
 * entry points hand this shape to the service, which turns it into a Mongo
 * `$match` via {@link buildInstructorMatch}. Clients never build Mongo operators.
 */
export interface InstructorFilterInput {
  search?: string;
  minRating?: number;
  categoryIds?: string | string[];
  gradeIds?: string | string[];
  schoolTypeIds?: string | string[];
}

/** Normalizes a scalar/array/CSV id param into a clean string[] (no empties). */
export function normalizeIds(value?: string | string[]): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

/**
 * Builds the instructor `$match` conditions from flat filters. Returns only the
 * filter-derived conditions — the mandatory role/status conditions are added by
 * the service. Search regex is escaped here so escaping lives in exactly one place.
 */
export function buildInstructorMatch(input: InstructorFilterInput): Record<string, unknown> {
  const match: Record<string, unknown> = {};

  if (input.search && input.search.trim().length > 0) {
    const escaped = escapeRegex(input.search.trim());
    match.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { username: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (input.minRating !== undefined && input.minRating !== null) {
    const minRating = Number(input.minRating);
    if (!Number.isNaN(minRating) && minRating > 0) {
      match.averageCoursesRating = { $gte: minRating };
    }
  }

  const categoryIds = normalizeIds(input.categoryIds);
  if (categoryIds.length > 0) {
    match.categoriesIds = { $in: categoryIds };
  }

  const gradeIds = normalizeIds(input.gradeIds);
  if (gradeIds.length > 0) {
    match.gradesIds = { $in: gradeIds };
  }

  const schoolTypeIds = normalizeIds(input.schoolTypeIds);
  if (schoolTypeIds.length > 0) {
    match.schoolTypesIds = { $in: schoolTypeIds };
  }

  return match;
}
