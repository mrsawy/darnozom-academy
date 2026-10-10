'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { deleteFromS3 } from '@/lib/utils/serverUtils';

interface CourseUpdateFormData extends Record<string, unknown> {
  thumbnailKey?: string;
  trailerKey?: string;
}

export const handleUpdateCourse = async (
  courseId: string,
  formData: FormData,
  oldThumbKey?: string,
  oldTrailerKey?: string
) => {
  try {
    const courseData: CourseUpdateFormData = {};
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
    interface CourseResponse {
      success?: boolean;
      [key: string]: unknown;
    }

    // throwError: surface server/validation errors instead of returning { err } as a "success"
    const response = await createAuthorizedNatsRequest<CourseResponse>(
      'course.updateCourse',
      { ...courseData, courseId },
      true
    );

    return response;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }

    const cleanupData: CourseUpdateFormData = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        cleanupData[key] = value;
      }
    }
    const uploadedThumbnailKey =
      typeof cleanupData.thumbnailKey === 'string' ? cleanupData.thumbnailKey : undefined;
    const uploadedTrailerKey =
      typeof cleanupData.trailerKey === 'string' ? cleanupData.trailerKey : undefined;
    if (uploadedThumbnailKey && uploadedThumbnailKey !== oldThumbKey) {
      await deleteFromS3(uploadedThumbnailKey);
    }
    if (uploadedTrailerKey && uploadedTrailerKey !== oldTrailerKey) {
      await deleteFromS3(uploadedTrailerKey);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(errorMessage);
  }
};
