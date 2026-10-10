'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { deleteFromS3 } from '@/lib/utils/serverUtils';
import { revalidatePath } from 'next/cache';
import { ROUTE_ORG_COURSES } from '@/lib/data/constants/routes.constants';

interface CourseFormData extends Record<string, unknown> {
  thumbnailKey?: string;
  trailerKey?: string;
}

export const handleCreateCourse = async (formData: FormData) => {
  const courseData: CourseFormData = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        courseData[key] = parsed;
      } catch {
        courseData[key] = value;
      }
    } else if (!(value instanceof File)) {
      courseData[key] = value;
    }
  }
  const uploadedThumbnailKey =
    typeof courseData.thumbnailKey === 'string' ? courseData.thumbnailKey : undefined;
  const uploadedTrailerKey =
    typeof courseData.trailerKey === 'string' ? courseData.trailerKey : undefined;
  try {
    interface CourseResponse {
      message: string;
      course: {
        _id: string;
        [key: string]: unknown;
      };
    }

    const response = await createAuthorizedNatsRequest<CourseResponse>(
      'course.createCourse',
      courseData as Record<string, unknown>
    );
    if (isNatsErrResult(response)) {
      if (uploadedThumbnailKey) await deleteFromS3(uploadedThumbnailKey);
      if (uploadedTrailerKey) await deleteFromS3(uploadedTrailerKey);
      throw new Error(response.err.message);
    }
    revalidatePath(ROUTE_ORG_COURSES);
    return response.course;
  } catch (error: unknown) {
    if (uploadedThumbnailKey) {
      await deleteFromS3(uploadedThumbnailKey);
    }
    if (uploadedTrailerKey) {
      await deleteFromS3(uploadedTrailerKey);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(errorMessage);
  }
};
