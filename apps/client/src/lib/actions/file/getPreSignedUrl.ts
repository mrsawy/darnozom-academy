'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export async function getPresignedUrl({
  fileType,
  fileSize,
  fileKey,
  isPublic = false,
}: {
  fileType: string;
  fileSize: number;
  fileKey: string;
  isPublic?: boolean;
}): Promise<PresignedUrlResponse | undefined> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);
    if (!idToken) throw new Error('No Token Provided');

    const response = await request(
      natsClient,
      'file.getPreSignedUrl',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          fileType,
          fileSize,
          fileKey,
          isPublic,
        },
      })
    );
    if (isNatsErrorResponse(response)) {
      return { err: { message: response.err.message } } as unknown as PresignedUrlResponse;
    }
    // Return the presigned payload (uploadUrl + normalized fileKey from server)
    return response as PresignedUrlResponse;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      return undefined;
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to get presigned URL';
    throw new Error(errorMessage);
  }
}

export async function getFileUrl({ fileKey }: { fileKey: string }): Promise<unknown> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);
    if (!idToken) throw new Error('No Token Provided');

    const response = await request(
      natsClient,
      'file.getFileUrl',
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to get FileUrl URL';
    throw new Error(errorMessage);
  }
}
