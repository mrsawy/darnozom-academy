import { NotificationType } from '@lms-organization/shared-types';
import type { NotificationTypeHandler } from './notification-handler.types';
import { chatNotificationHandler } from './handlers/chat.handler';
import { courseCompletedNotificationHandler } from './handlers/course-completed.handler';
import { courseContentNotificationHandler } from './handlers/course-content.handler';
import { defaultNotificationHandler } from './handlers/default.handler';
import { securityNotificationHandler } from './handlers/security.handler';

/** Notification `type` → its dedicated handler file. Add a new type here alongside its `handlers/*.ts` file. */
const NOTIFICATION_HANDLERS: Record<string, NotificationTypeHandler> = {
  [NotificationType.COURSE_CONTENT]: courseContentNotificationHandler,
  [NotificationType.COURSE_COMPLETED]: courseCompletedNotificationHandler,
  [NotificationType.SECURITY]: securityNotificationHandler,
  [NotificationType.CHAT]: chatNotificationHandler,
};

export function getNotificationHandler(type: string): NotificationTypeHandler {
  return NOTIFICATION_HANDLERS[type] ?? defaultNotificationHandler;
}
