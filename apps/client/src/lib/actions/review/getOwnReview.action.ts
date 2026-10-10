'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { ReviewType } from '@/lib/types/review/review.types';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export interface FindOwnReviewInput {
  reviewType: ReviewType;
  courseId?: string;
  moduleId?: string;
  contentId?: string;
  instructorId?: string;
  reviewedOrganizationId?: string;
}

export async function getOwnReview(filters: FindOwnReviewInput): Promise<unknown> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const response = await request(
      natsClient,
      'reviews.findOwn',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          ...filters,
        },
      })
    );

    if (response !== null && isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } };
    }

    return response; // Returns null if no review found
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get own review';
    throw new Error(errorMessage);
  }
}
