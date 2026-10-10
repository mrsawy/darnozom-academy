'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';

export async function getEnrollmentByCourse(courseId: string): Promise<IEnrollment | null> {
  const result = await createAuthorizedNatsRequest<IEnrollment | null>(
    'enrollment.getEnrollmentByCourse',
    {
      courseId,
    }
  );
  if (isNatsErrResult(result)) {
    throw new Error(result.err.message);
  }
  return result;
}
