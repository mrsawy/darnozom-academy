import type { QueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/lib/hooks/notification/use-notifications.hook';
import type { INotification } from '@/lib/actions/notification/notification.action';
import { getNotificationHandler } from './notification-handlers.registry';
import type { NotificationTranslate } from './translate-notification';

/** Called when a notification arrives live over the socket: refreshes the list/badge, then shows its toast. */
export function handleRealtimeNotificationArrival(
  notification: INotification,
  queryClient: QueryClient,
  t: NotificationTranslate
): void {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  getNotificationHandler(notification.type).showArrivalToast(notification, t);
}
