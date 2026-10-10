import type { INotification } from '@/lib/actions/notification/notification.action';

/** `useTranslations('Notifications')` — narrow enough to avoid pulling in next-intl's full type here. */
export type NotificationTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Translates a notification's `titleKey`/`bodyKey` + `params` into display text. Never render the keys directly.
 *
 * Falls back to the raw `title`/`body` fields for notifications written before this became a translation
 * key — those fields were dropped from the schema, but old documents still carry them and the server still
 * sends them over the wire (Mongoose includes stored-but-undeclared fields when serializing a document).
 */
export function translateNotificationTitle(
  notification: INotification,
  t: NotificationTranslate
): string {
  if (!notification.titleKey) return notification.title ?? '';
  return t(notification.titleKey, notification.params);
}

export function translateNotificationBody(
  notification: INotification,
  t: NotificationTranslate
): string | undefined {
  if (!notification.titleKey) return notification.body ?? undefined;
  return notification.bodyKey ? t(notification.bodyKey, notification.params) : undefined;
}

/** "Title: body" when there is a body, otherwise just the title. Used for toasts. */
export function translateNotificationToastText(
  notification: INotification,
  t: NotificationTranslate
): string {
  const title = translateNotificationTitle(notification, t);
  const body = translateNotificationBody(notification, t);
  return body ? `${title}: ${body}` : title;
}
