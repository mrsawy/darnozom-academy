/**
 * AI prompt-file attachment error keys. Use as translation keys on backend and frontend.
 * Dynamic params follow the `key|param|param` convention; see docs/api-error-messages.md.
 */
export enum AiAttachmentErrors {
  AI_ATTACHMENT_TOO_LARGE_PER_FILE = 'aiAttachmentTooLargePerFile',
  AI_ATTACHMENT_TOO_LARGE_TOTAL = 'aiAttachmentTooLargeTotal',
  AI_ATTACHMENT_BAD_TYPE = 'aiAttachmentBadType',
  AI_ATTACHMENT_TOO_MANY = 'aiAttachmentTooMany',
  AI_QUIZ_QUESTION_COUNT_EXCEEDED = 'aiQuizQuestionCountExceeded',
}
