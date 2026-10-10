import type { INotification } from '@/lib/actions/notification/notification.action';
import { getNotificationHandler } from './notification-handlers.registry';
import type { NotificationClickContext } from './notification-handler.types';

/** Called when the student clicks a notification in the dropdown: routes to that type's dedicated handler. */
export function handleNotificationClick(
  notification: INotification,
  ctx: NotificationClickContext
): void | Promise<void> {
  return getNotificationHandler(notification.type).handleClick(notification, ctx);
}
