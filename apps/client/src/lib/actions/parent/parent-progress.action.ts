'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  IRelatedStudentProgress,
  IRelatedStudentEnrollmentDetails,
  IParentProgressFilters,
} from '@/lib/types/parent/parent-progress.interface';

export async function getRelatedStudentsProgress(filters?: IParentProgressFilters) {
  return createAuthorizedNatsRequest<IRelatedStudentProgress[]>(
    'parents.studentsProgress',
    filters ?? {}
  );
}

export async function getSingleRelatedStudentProgress(
  studentId: string,
  filters?: IParentProgressFilters
) {
  return createAuthorizedNatsRequest<IRelatedStudentProgress>('parents.studentProgress', {
    studentId,
    ...filters,
  });
}

export async function getRelatedStudentEnrollmentDetails(enrollmentId: string) {
  return createAuthorizedNatsRequest<IRelatedStudentEnrollmentDetails>(
    'parents.enrollmentDetails',
    {
      enrollmentId,
    }
  );
}
