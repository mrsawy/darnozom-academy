'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export const deleteS3File = async (fileKey: string): Promise<unknown> => {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);
    if (!idToken) throw new Error('No Token Provided');

    const response = await request(
      natsClient,
      'file.deleteFile',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          fileKey,
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } };
    }
    // Return the response
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete File';
    throw new Error(errorMessage);
  }
};
