import { NotificationType } from '../notification/notification-type.enum';

/**
 * Socket event names pushed from the server's `/realtime` gateway. Shared so the server
 * (RealtimeService.emitToUser) and the client (the realtime socket listener) never drift.
 *
 * Each live-pushed notification type gets its own named event — add one here (and to
 * `NOTIFICATION_REALTIME_EVENT`) rather than routing every type through one generic channel,
 * so each type can be handled by its own dedicated client-side file.
 */
export const RealtimeEvents = {
  AUTH_SESSION_REPLACED: 'auth.session.replaced',
  /** A new course content item became visible to an enrolled student. */
  NOTIFICATION_COURSE_CONTENT_CREATED: 'notification.course-content.created',
} as const;

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];

/** Which `NotificationType`s are pushed live over the socket, and under which event name. */
export const NOTIFICATION_REALTIME_EVENT: Partial<Record<NotificationType, RealtimeEvent>> = {
  [NotificationType.COURSE_CONTENT]: RealtimeEvents.NOTIFICATION_COURSE_CONTENT_CREATED,
};
