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
  DISCUSSION_REPLY_TITLE = 'discussionReplyTitle',
  DISCUSSION_REPLY_BODY = 'discussionReplyBody',
  DISCUSSION_NEW_TITLE = 'discussionNewTitle',
  DISCUSSION_NEW_BODY = 'discussionNewBody',
  SECURITY_LOGGED_OUT_TITLE = 'securityLoggedOutTitle',
  SECURITY_LOGGED_OUT_BODY = 'securityLoggedOutBody',
  CHAT_MESSAGE_TITLE = 'chatMessageTitle',
  CHAT_MESSAGE_BODY = 'chatMessageBody',
  CHAT_MESSAGE_ATTACHMENT_BODY = 'chatMessageAttachmentBody',
}
