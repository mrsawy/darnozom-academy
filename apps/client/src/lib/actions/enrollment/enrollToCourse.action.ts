'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { PaymentResponse } from '@/lib/types/payment/directPaymentResponse.interface';
import { CreateEnrollmentHttpDto } from '@/lib/types/enrollment/createEnrollment.dto';

export async function enrollToFreeCourse(courseId: string): Promise<IEnrollment> {
  return (await createAuthorizedNatsRequest<IEnrollment>(
    'enrollment.enrollToFreeCourse',
    { courseId },
    true
  )) as IEnrollment;
}

export async function enrollChildToFreeCourse(
  courseId: string,
  childId: string
): Promise<IEnrollment> {
  return (await createAuthorizedNatsRequest<IEnrollment>(
    'enrollment.parentEnrollChildToFreeCourse',
    { courseId, childId },
    true
  )) as IEnrollment;
}

export async function enrollToCourse(
  payload: CreateEnrollmentHttpDto & { childId?: string }
): Promise<PaymentResponse | IEnrollment> {
  const pattern = payload.childId
    ? 'enrollment.parentEnrollChildToCourse'
    : 'enrollment.enrollToCourse';
  return (await createAuthorizedNatsRequest<PaymentResponse | IEnrollment>(
    pattern,
    payload,
    true
  )) as PaymentResponse | IEnrollment;
}
