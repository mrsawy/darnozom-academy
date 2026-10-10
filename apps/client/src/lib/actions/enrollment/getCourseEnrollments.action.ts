'use server';

import { PaginationOptions, Paginated, withDefaults } from '@/lib/types/Paginated';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';

export async function getCourseEnrollments(
  courseId: string,
  options: PaginationOptions
): Promise<Paginated<IEnrollment>> {
  const result = await createAuthorizedNatsRequest<Paginated<IEnrollment>>(
    'enrollment.getCourseEnrollments',
    {
      courseId,
      options: withDefaults<PaginationOptions>(options),
    }
  );
  if (isNatsErrResult(result)) {
    throw new Error(result.err.message);
  }
  return result;
}
