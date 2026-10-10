'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { UpdateDiscussionInput, IDiscussion } from '@/lib/types/discussion/discussion.types';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export async function updateDiscussion(
  discussionId: string,
  data: UpdateDiscussionInput
): Promise<IDiscussion> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const payload = {
      id: discussionId,
      updateDiscussionDto: {
        content: data.content,
      },
    };

    const response = await request(
      natsClient,
      'discussion.update',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          ...payload,
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as IDiscussion;
    }

    return response as IDiscussion;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update discussion';
    throw new Error(errorMessage);
  }
}
