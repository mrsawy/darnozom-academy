'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';

export interface ChildEnrollmentStatus {
  enrolled: boolean;
  expired: boolean;
  enrollmentId?: string;
}

export async function getChildrenEnrollmentStatus(
  childIds: string[],
  courseId: string
): Promise<Record<string, ChildEnrollmentStatus>> {
  const result = await createAuthorizedNatsRequest<Record<string, ChildEnrollmentStatus>>(
    'enrollment.getChildrenEnrollmentStatus',
    { childIds, courseId }
  );
  if (isNatsErrResult(result)) {
    throw new Error(result.err.message);
  }
  return result;
}
