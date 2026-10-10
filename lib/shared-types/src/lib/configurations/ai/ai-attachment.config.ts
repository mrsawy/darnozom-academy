export const AI_ATTACHMENT_MAX_FILES = 5;
export const AI_ATTACHMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;
export const AI_ATTACHMENT_PER_FILE_TEXT_BUDGET = 30_000;
export const AI_ATTACHMENT_TOTAL_TEXT_BUDGET = 80_000;

export const AI_ATTACHMENT_MIME_PDF = 'application/pdf';
export const AI_ATTACHMENT_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const AI_ATTACHMENT_MIME_TXT = 'text/plain';
export const AI_ATTACHMENT_MIME_MD = 'text/markdown';
export const AI_ATTACHMENT_MIME_PNG = 'image/png';
export const AI_ATTACHMENT_MIME_JPEG = 'image/jpeg';
export const AI_ATTACHMENT_MIME_WEBP = 'image/webp';

export const AI_ATTACHMENT_ALLOWED_MIME = [
  AI_ATTACHMENT_MIME_PDF,
  AI_ATTACHMENT_MIME_DOCX,
  AI_ATTACHMENT_MIME_TXT,
  AI_ATTACHMENT_MIME_MD,
  AI_ATTACHMENT_MIME_PNG,
  AI_ATTACHMENT_MIME_JPEG,
  AI_ATTACHMENT_MIME_WEBP,
] as const;

export const AI_ATTACHMENT_IMAGE_MIME = [AI_ATTACHMENT_MIME_PNG, AI_ATTACHMENT_MIME_JPEG, AI_ATTACHMENT_MIME_WEBP] as const;

export const AI_ATTACHMENT_TEXTUAL_MIME = [AI_ATTACHMENT_MIME_TXT, AI_ATTACHMENT_MIME_MD] as const;

export type AiAttachmentMime = (typeof AI_ATTACHMENT_ALLOWED_MIME)[number];

export const AI_QUIZ_MAX_QUESTIONS = 100;
export const AI_QUIZ_MIN_QUESTIONS = 1;
