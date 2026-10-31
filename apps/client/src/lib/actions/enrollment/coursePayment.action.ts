'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  CoursePaymentStatus,
  ICoursePayment,
  ICoursePaymentOptions,
  SubmitCoursePaymentInput,
} from '@/lib/types/enrollment/course-payment';

export async function getCoursePaymentOptions(courseId: string) {
  return createAuthorizedNatsRequest<ICoursePaymentOptions>('coursePayment.options', { courseId });
}

export async function submitCoursePayment(data: SubmitCoursePaymentInput) {
  return createAuthorizedNatsRequest<ICoursePayment>('coursePayment.submit', data);
}

export async function getMyCoursePayments() {
  return createAuthorizedNatsRequest<ICoursePayment[]>('coursePayment.listMine', {});
}

export async function getOrgCoursePayments(filter?: { status?: CoursePaymentStatus; courseId?: string }) {
  return createAuthorizedNatsRequest<ICoursePayment[]>('coursePayment.listForOrg', filter ?? {});
}

export async function approveCoursePayment(paymentId: string) {
  return createAuthorizedNatsRequest<{ success: boolean }>('coursePayment.approve', { paymentId });
}

export async function rejectCoursePayment(paymentId: string, reason: string) {
  return createAuthorizedNatsRequest<{ success: boolean }>('coursePayment.reject', { paymentId, reason });
}
