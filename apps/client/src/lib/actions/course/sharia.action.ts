'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IContentVersion, IShariaQueueItem } from '@/lib/types/course/sharia';

export async function getShariaQueue() {
  return createAuthorizedNatsRequest<IShariaQueueItem[]>('course.sharia.queue', {});
}

export async function getContentVersions(contentId: string) {
  return createAuthorizedNatsRequest<IContentVersion[]>('course.sharia.myVersions', { contentId });
}

export async function approveShariaVersion(contentId: string, version: number) {
  return createAuthorizedNatsRequest<void>('course.sharia.approve', { contentId, version });
}

export async function rejectShariaVersion(contentId: string, version: number, comment: string) {
  return createAuthorizedNatsRequest<void>('course.sharia.reject', { contentId, version, comment });
}
