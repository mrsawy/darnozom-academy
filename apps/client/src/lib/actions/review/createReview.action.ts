'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { CreateReviewInput } from '@/lib/types/review/review.types';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export async function createReview(data: CreateReviewInput): Promise<unknown> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    // We need to match CreateReviewDto structure expected by NestJS
    // ReviewControllerMessage: @Payload(new RpcValidationPipe()) createReviewDto: CreateReviewDto
    // And it sets userId from context.

    const payload = {
      reviewType: data.reviewType,
      rating: data.rating,
      comment: data.comment,
      courseId: data.courseId,
      moduleId: data.moduleId,
      contentId: data.contentId,
      instructorId: data.instructorId,
      reviewedOrganizationId: data.reviewedOrganizationId,
      // Add other fields if necessary
    };

    const response = await request(
      natsClient,
      'reviews.create',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          ...payload,
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } };
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create review';
    throw new Error(errorMessage);
  }
}
