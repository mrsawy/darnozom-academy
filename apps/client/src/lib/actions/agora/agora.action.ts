'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export interface AgoraTokenResult {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresAt: number;
}

export async function requestLiveSessionToken(contentId: string, enrollmentId?: string) {
  return createAuthorizedNatsRequest<AgoraTokenResult>('agora.liveSessionToken', {
    contentId,
    ...(enrollmentId ? { enrollmentId } : {}),
  });
}

export async function requestPrivateSessionToken(bookingId: string) {
  return createAuthorizedNatsRequest<AgoraTokenResult>('agora.privateSessionToken', { bookingId });
}
