'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { CreateDiscussionInput, IDiscussion } from '@/lib/types/discussion/discussion.types';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export async function createDiscussion(data: CreateDiscussionInput): Promise<IDiscussion> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const payload = {
      createDiscussionDto: {
        type: data.type,
        content: data.content,
        courseId: data.courseId,
        moduleId: data.moduleId,
        contentId: data.contentId,
        parentId: data.parentId,
      },
    };

    const response = await request(
      natsClient,
      'discussion.create',
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to create discussion';
    throw new Error(errorMessage);
  }
}
