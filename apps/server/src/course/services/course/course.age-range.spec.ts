import { BadRequestException } from '@nestjs/common';
import { AgeRangeErrors } from '@darnozom/shared-types';
import { CourseService } from './course.service';

/** Unit tests for the optional AgeRange association validation. */
describe('CourseService age-range validation', () => {
  const ageRangeExists = jest.fn();
  const ageRangeModel = { exists: ageRangeExists };

  // Constructor parameter positions mirror CourseService; only the age-range model is used here.
  const args = Array.from({ length: 11 }, () => undefined as never) as unknown[];
  args[4] = ageRangeModel as never;
  const service = new CourseService(...(args as unknown as ConstructorParameters<typeof CourseService>));

  const assertExist = (ids?: string[] | null) =>
    (service as unknown as { assertAgeRangesExist: (i?: string[] | null) => Promise<void> }).assertAgeRangesExist(ids);

  beforeEach(() => jest.clearAllMocks());

  it('passes for null / undefined / empty without querying', async () => {
    await expect(assertExist(null)).resolves.toBeUndefined();
    await expect(assertExist()).resolves.toBeUndefined();
    await expect(assertExist([])).resolves.toBeUndefined();
    expect(ageRangeExists).not.toHaveBeenCalled();
  });

  it('passes when every id exists', async () => {
    ageRangeExists.mockResolvedValue({ _id: 'x' });
    await expect(assertExist(['a', 'b'])).resolves.toBeUndefined();
    expect(ageRangeExists).toHaveBeenCalledTimes(2);
  });

  it('throws AGE_RANGE_NOT_FOUND when an id is missing', async () => {
    ageRangeExists.mockResolvedValueOnce({ _id: 'a' }).mockResolvedValueOnce(null);
    const err = await assertExist(['a', 'b']).catch((error: unknown) => error);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).message).toBe(AgeRangeErrors.AGE_RANGE_NOT_FOUND);
  });
});
