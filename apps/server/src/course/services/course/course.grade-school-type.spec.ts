import { BadRequestException } from '@nestjs/common';
import { GradeErrors, SchoolTypeErrors } from '@lms-organization/shared-types';
import { CourseService } from './course.service';

/**
 * Focused unit tests for the optional Grade / SchoolType association validation.
 * Grade and SchoolType are fully independent: either may be provided without the
 * other, and both are optional (null / undefined / empty => skipped).
 */
describe('CourseService grade/school-type validation', () => {
  const gradeExists = jest.fn();
  const schoolTypeExists = jest.fn();

  const gradeModel = { exists: gradeExists };
  const schoolTypeModel = { exists: schoolTypeExists };

  // Only the grade/school-type models are needed for this helper; the rest are
  // never touched by assertGradeAndSchoolTypeExist.
  const service = new CourseService(
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    gradeModel as never,
    schoolTypeModel as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never
  );

  const assertExist = (gradeId?: string | null, schoolTypeIds?: string[] | null) =>
    (
      service as unknown as {
        assertGradeAndSchoolTypeExist: (g?: string | null, s?: string[] | null) => Promise<void>;
      }
    ).assertGradeAndSchoolTypeExist(gradeId, schoolTypeIds);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when both are null (existing courses keep working)', async () => {
    await expect(assertExist(null, null)).resolves.toBeUndefined();
    expect(gradeExists).not.toHaveBeenCalled();
    expect(schoolTypeExists).not.toHaveBeenCalled();
  });

  it('passes when schoolTypeIds is empty', async () => {
    await expect(assertExist(null, [])).resolves.toBeUndefined();
    expect(schoolTypeExists).not.toHaveBeenCalled();
  });

  it('validates only the grade when only a grade is supplied', async () => {
    gradeExists.mockResolvedValue({ _id: 'grade-1' });

    await expect(assertExist('grade-1', null)).resolves.toBeUndefined();
    expect(gradeExists).toHaveBeenCalledWith({ _id: 'grade-1' });
    expect(schoolTypeExists).not.toHaveBeenCalled();
  });

  it('validates only the school type when only a school type is supplied', async () => {
    schoolTypeExists.mockResolvedValue({ _id: 'st-1' });

    await expect(assertExist(null, ['st-1'])).resolves.toBeUndefined();
    expect(schoolTypeExists).toHaveBeenCalledWith({ _id: 'st-1' });
    expect(gradeExists).not.toHaveBeenCalled();
  });

  it('validates each school type id', async () => {
    schoolTypeExists.mockResolvedValue({ _id: 'st' });
    await expect(assertExist(null, ['st-1', 'st-2'])).resolves.toBeUndefined();
    expect(schoolTypeExists).toHaveBeenCalledTimes(2);
  });

  it('throws BadRequestException for an invalid grade id', async () => {
    gradeExists.mockResolvedValue(null);

    await expect(assertExist('missing-grade', null)).rejects.toThrow(BadRequestException);
    await expect(assertExist('missing-grade', null)).rejects.toThrow(GradeErrors.GRADE_NOT_FOUND);
  });

  it('throws BadRequestException for an invalid school type id', async () => {
    gradeExists.mockResolvedValue({ _id: 'grade-1' });
    schoolTypeExists.mockResolvedValue(null);

    await expect(assertExist('grade-1', ['missing-st'])).rejects.toThrow(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
  });

  it('throws when any school type id is missing', async () => {
    schoolTypeExists.mockResolvedValueOnce({ _id: 'st-1' }).mockResolvedValueOnce(null);
    await expect(assertExist(null, ['st-1', 'missing'])).rejects.toThrow(SchoolTypeErrors.SCHOOL_TYPE_NOT_FOUND);
  });
});
