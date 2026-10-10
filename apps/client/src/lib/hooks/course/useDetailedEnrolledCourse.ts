'use client';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { ICourseOverview } from '@/lib/types/course/course.interface';
import {
  IEnrollment,
  IEnrollmentProgress,
  SubscriptionTypeDef,
} from '@/lib/types/enrollment/enrollment.interface';
import { useQuery } from '@/lib/utils';

export const detailedEnrolledCourseKeys = {
  all: ['detailedEnrolledCourse'] as const,
  detail: (enrollmentId: string) => [...detailedEnrolledCourseKeys.all, enrollmentId] as const,
};

interface GetDetailedEnrolledCourseResponse {
  data: { course: ICourseOverview; enrollment: IEnrollment };
  message: string;
}

export interface DetailedEnrolledCourseData {
  course: ICourseOverview;
  enrollment: IEnrollment;
  progress: IEnrollmentProgress;
  subscription: SubscriptionTypeDef | undefined;
}

export function useDetailedEnrolledCourse(enrollmentId: string) {
  return useQuery<DetailedEnrolledCourseData>({
    queryKey: detailedEnrolledCourseKeys.detail(enrollmentId),
    queryFn: async () => {
      const result = await createAuthorizedNatsRequest<GetDetailedEnrolledCourseResponse>(
        'enrollment.getDetailedEnrolledCourse',
        { enrollmentId }
      );
      if ('err' in result) throw new Error(result.err.message);
      const { course, enrollment } = result.data;
      return {
        course,
        enrollment,
        progress: enrollment.progress,
        subscription: enrollment.subscription,
      };
    },
    enabled: Boolean(enrollmentId),
    staleTime: 60 * 1000,
  });
}
