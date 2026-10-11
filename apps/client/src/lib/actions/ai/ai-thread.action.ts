'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { getCookie } from '@/lib/utils/serverUtils';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';
import { refreshAuthTokens } from '@/lib/actions/auth/auth.action';
import { AuthErrors, CommonErrors } from '@darnozom/shared-types';
import type { UIMessage } from '@ai-sdk/react';

export interface AiThreadMetadata {
  remoteId: string;
  externalId?: string;
  title?: string;
  status: 'regular' | 'archived';
}

export interface ListAiThreadsResponse {
  threads: AiThreadMetadata[];
  hasMore: boolean;
  total: number;
}
interface InitResponse {
  remoteId: string;
  externalId: undefined;
}
export interface MessagesResponse {
  messages: UIMessage[];
  hasMore: boolean;
}

export async function listAiThreads(params?: { page?: number; limit?: number }) {
  return createAuthorizedNatsRequest<ListAiThreadsResponse | { err: { message: string } }>(
    'ai.threads.list',
    { page: params?.page ?? 1, limit: params?.limit ?? 20 }
  );
}

export async function initializeAiThread() {
  return createAuthorizedNatsRequest<InitResponse | { err: { message: string } }>(
    'ai.threads.initialize',
    {}
  );
}

export async function fetchAiThread(remoteId: string) {
  return createAuthorizedNatsRequest<AiThreadMetadata | { err: { message: string } }>(
    'ai.threads.fetch',
    { remoteId }
  );
}

export async function renameAiThread(remoteId: string, title: string) {
  return createAuthorizedNatsRequest<{ success: boolean } | { err: { message: string } }>(
    'ai.threads.rename',
    { remoteId, title }
  );
}

export async function archiveAiThread(remoteId: string) {
  return createAuthorizedNatsRequest<{ success: boolean } | { err: { message: string } }>(
    'ai.threads.archive',
    { remoteId }
  );
}

export async function unarchiveAiThread(remoteId: string) {
  return createAuthorizedNatsRequest<{ success: boolean } | { err: { message: string } }>(
    'ai.threads.unarchive',
    { remoteId }
  );
}

export async function deleteAiThread(remoteId: string) {
  return createAuthorizedNatsRequest<{ success: boolean } | { err: { message: string } }>(
    'ai.threads.delete',
    { remoteId }
  );
}

export interface GetAiThreadMessagesParams {
  /** Max messages to return (default 12, max 100). */
  limit?: number;
  /** If set, return messages strictly older than this message id (for infinite scroll). */
  before?: string;
}

/**
 * Loads thread messages over HTTP (not NATS) because payloads can exceed NATS max_payload.
 * Nest route: GET /ai/threads/:id/messages?limit=&before=
 */
export async function getAiThreadMessages(remoteId: string, params?: GetAiThreadMessagesParams) {
  let token = await getCookie(AUTH_COOKIE_NAME);
  if (!token) {
    return { err: { message: AuthErrors.AUTHENTICATION_REQUIRED } };
  }

  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.before) search.set('before', params.before);
  const qs = search.toString();

  const url = `${getPublicApiUrl()}/ai/threads/${encodeURIComponent(remoteId)}/messages${qs ? `?${qs}` : ''}`;

  const doFetch = () =>
    fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await refreshAuthTokens();
    if (!refreshed) {
      return { err: { message: CommonErrors.UNAUTHORIZED } };
    }
    token = (await getCookie(AUTH_COOKIE_NAME)) ?? '';
    if (!token) {
      return { err: { message: AuthErrors.AUTHENTICATION_REQUIRED } };
    }
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text();
    return { err: { message: text || `Failed to load messages (${res.status})` } };
  }

  const data = (await res.json()) as MessagesResponse;
  if (typeof data.hasMore !== 'boolean') {
    return { ...data, hasMore: false };
  }
  return data;
}
