/** Notification `type` values. Shared so the server that writes notifications and the client that
 * renders/dispatches them agree on the same set. */
export enum NotificationType {
  COURSE_CONTENT = 'course_content',
  COURSE_COMPLETED = 'course_completed',
  SECURITY = 'security',
  CHAT = 'chat',
  INFO = 'info',
}
