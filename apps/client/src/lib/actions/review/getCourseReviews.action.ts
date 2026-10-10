'use server';

import { createNatsRequest } from '@/lib/utils/createNatsRequest';
import type { Paginated } from '@/lib/types/Paginated';
import type { CourseReviewListItem } from '@/lib/types/review/review.types';

export async function getCourseReviews(
  courseId: string,
  page: number,
  limit: number
): Promise<Paginated<CourseReviewListItem> | { err: { message: string } }> {
  return createNatsRequest<Paginated<CourseReviewListItem> | { err: { message: string } }>(
    'reviews.findByCourse',
    { courseId, page, limit }
  );
}
