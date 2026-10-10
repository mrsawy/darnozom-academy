'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { GetDiscussionsInput, DiscussionsResponse } from '@/lib/types/discussion/discussion.types';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export async function getDiscussions(data: GetDiscussionsInput): Promise<DiscussionsResponse> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const payload = {
      type: data.type,
      entityId: data.entityId,
      moduleId: data.moduleId,
      contentId: data.contentId,
      parentId: data.parentId,
      page: data.page ?? 1,
      limit: data.limit ?? 20,
    };

    const response = await request(
      natsClient,
      'discussion.findAll',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          ...payload,
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as DiscussionsResponse;
    }

    return response as DiscussionsResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch discussions';
    throw new Error(errorMessage);
  }
}
