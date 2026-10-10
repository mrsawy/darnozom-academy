'use server';

import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface InitiateMultipartResponse {
  uploadId: string;
  key: string;
  presignedUrls: PresignedPart[];
}

export async function initiateMultipartUpload({
  key,
  contentType,
  fileSize,
  isPublic = false,
  contentId,
  enrollmentId,
}: {
  key: string;
  contentType: string;
  fileSize: number;
  isPublic?: boolean;
  /** Student assignment submission: required with enrollmentId for gated uploads. */
  contentId?: string;
  enrollmentId?: string;
}): Promise<InitiateMultipartResponse> {
  const natsClient = await connectToNats();
  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (!idToken) throw new Error('No Token Provided');

  const response = await request(
    natsClient,
    'file.multipart.initiate',
    JSON.stringify({
      id: randomUUID(),
      data: {
        authorization: idToken,
        key,
        contentType,
        fileSize,
        isPublic,
        ...(contentId && enrollmentId ? { contentId, enrollmentId } : {}),
      },
    })
  );

  if (isNatsErrorResponse(response)) {
    return { err: { message: response.err.message } } as unknown as InitiateMultipartResponse;
  }

  return response as InitiateMultipartResponse;
}

export async function completeMultipartUpload({
  key,
  uploadId,
  parts,
}: {
  key: string;
  uploadId: string;
  parts: { PartNumber: number; ETag: string }[];
}): Promise<{ location: string | undefined; key: string | undefined }> {
  const natsClient = await connectToNats();
  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (!idToken) throw new Error('No Token Provided');

  const response = await request(
    natsClient,
    'file.multipart.complete',
    JSON.stringify({
      id: randomUUID(),
      data: {
        authorization: idToken,
        key,
        uploadId,
        parts,
      },
    })
  );

  if (isNatsErrorResponse(response)) {
    return { err: { message: response.err.message } } as unknown as {
      location: string | undefined;
      key: string | undefined;
    };
  }

  return response as { location: string | undefined; key: string | undefined };
}

export async function abortMultipartUpload({
  key,
  uploadId,
}: {
  key: string;
  uploadId: string;
}): Promise<void> {
  const natsClient = await connectToNats();
  const idToken = await getCookie(AUTH_COOKIE_NAME);
  if (!idToken) throw new Error('No Token Provided');

  const response = await request(
    natsClient,
    'file.multipart.abort',
    JSON.stringify({
      id: randomUUID(),
      data: {
        authorization: idToken,
        key,
        uploadId,
      },
    })
  );

  if (isNatsErrorResponse(response)) {
    return { err: { message: response.err.message } } as unknown as void;
  }
}
