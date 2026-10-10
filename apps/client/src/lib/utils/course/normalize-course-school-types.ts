import type { ILocalizedLookup } from '@/lib/types/course/course.interface';

export interface CourseSchoolTypeSource {
  schoolTypeIds?: string[] | null;
  schoolTypes?: ILocalizedLookup[] | null;
  /** @deprecated legacy read compat */
  schoolTypeId?: string | null;
  /** @deprecated legacy read compat */
  schoolType?: ILocalizedLookup | null;
}

/**
 * Normalize course school-type fields so callers always get arrays.
 * Accepts plural API shape and legacy singular payloads.
 */
export function normalizeCourseSchoolTypes(course: CourseSchoolTypeSource): {
  schoolTypeIds: string[];
  schoolTypes: ILocalizedLookup[];
} {
  // Intentional reads of deprecated singular fields for older API payloads.
  /* eslint-disable @typescript-eslint/no-deprecated -- legacy payload compat */
  const legacySchoolType = course.schoolType;
  const legacySchoolTypeId = course.schoolTypeId;
  /* eslint-enable @typescript-eslint/no-deprecated */

  const schoolTypes =
    course.schoolTypes && course.schoolTypes.length > 0
      ? course.schoolTypes
      : legacySchoolType
        ? [legacySchoolType]
        : [];

  const schoolTypeIds =
    course.schoolTypeIds && course.schoolTypeIds.length > 0
      ? course.schoolTypeIds
      : legacySchoolTypeId
        ? [legacySchoolTypeId]
        : schoolTypes.map((s) => s._id);

  return { schoolTypeIds, schoolTypes };
}
