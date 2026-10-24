/**
 * Notification title/body translation keys. Same role as `AuthErrors`: the enum value is the
 * key under the client's `Notifications` i18n namespace, set by the server and translated by
 * the client — the server never stores final English text.
 */
export enum NotificationTextKey {
  COURSE_CONTENT_TITLE = 'courseContentTitle',
  COURSE_CONTENT_BODY = 'courseContentBody',
  COURSE_COMPLETED_TITLE = 'courseCompletedTitle',
  COURSE_COMPLETED_BODY = 'courseCompletedBody',
  SECURITY_LOGGED_OUT_TITLE = 'securityLoggedOutTitle',
  SECURITY_LOGGED_OUT_BODY = 'securityLoggedOutBody',
  CHAT_MESSAGE_TITLE = 'chatMessageTitle',
  CHAT_MESSAGE_BODY = 'chatMessageBody',
  CHAT_MESSAGE_ATTACHMENT_BODY = 'chatMessageAttachmentBody',
  TASK_ASSIGNED_TITLE = 'taskAssignedTitle',
  TASK_ASSIGNED_BODY = 'taskAssignedBody',
  TASK_ESCALATED_TITLE = 'taskEscalatedTitle',
  TASK_ESCALATED_BODY = 'taskEscalatedBody',
  ORG_APPROVED_TITLE = 'orgApprovedTitle',
  ORG_APPROVED_BODY = 'orgApprovedBody',
  ORG_REJECTED_TITLE = 'orgRejectedTitle',
  ORG_REJECTED_BODY = 'orgRejectedBody',
}
