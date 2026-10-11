'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { NotificationType } from '@darnozom/shared-types';

export interface INotification {
  _id: string;
  userId: string;
  /** Translation key under the client's `Notifications` i18n namespace — never final text. */
  titleKey: string;
  /** Translation key under the client's `Notifications` i18n namespace, if the notification has a body. */
  bodyKey?: string;
  /** Interpolation values for `titleKey`/`bodyKey`. */
  params?: Record<string, string>;
  /** Extra payload used to route a click (e.g. `{ courseId, contentId }`). Not translated. */
  data?: Record<string, string>;
  /** Pre-migration notifications stored final English text directly instead of `titleKey`/`bodyKey`. */
  title?: string;
  body?: string;
  read: boolean;
  type: NotificationType;
  relatedId?: string;
  relatedModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  docs: INotification[];
  totalDocs: number;
  unreadCount: number;
}

export async function getNotifications(options?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  return createAuthorizedNatsRequest<NotificationsResponse>(
    'notifications.getForUser',
    options ?? {}
  );
}

export async function getUnreadNotificationCount() {
  return createAuthorizedNatsRequest<number>('notifications.getUnreadCount', {});
}

export async function markNotificationAsRead(notificationId: string) {
  return createAuthorizedNatsRequest<INotification>('notifications.markAsRead', { notificationId });
}

export async function markAllNotificationsAsRead() {
  return createAuthorizedNatsRequest<{ modifiedCount: number }>('notifications.markAllAsRead', {});
}
