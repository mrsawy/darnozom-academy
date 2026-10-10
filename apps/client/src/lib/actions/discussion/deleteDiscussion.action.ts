'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export async function deleteDiscussion(discussionId: string): Promise<void> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const payload = {
      id: discussionId,
    };

    const response = await request(
      natsClient,
      'discussion.remove',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          ...payload,
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as void;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete discussion';
    throw new Error(errorMessage);
  }
}
