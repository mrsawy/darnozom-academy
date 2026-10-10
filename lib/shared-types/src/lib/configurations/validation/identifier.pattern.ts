/**
 * Username / organization slug pattern.
 * Starts with any Unicode letter (Latin, Arabic, etc.), then letters, numbers, or underscores.
 */
export const IDENTIFIER_PATTERN = /^\p{L}[\p{L}\p{N}_]*$/u;

/** Characters allowed in a username / org slug body (no start-letter rule). */
export const IDENTIFIER_CHARS_PATTERN = /^[\p{L}\p{N}_]+$/u;

/** Must start with any Unicode letter. */
export const IDENTIFIER_STARTS_WITH_LETTER = /^\p{L}/u;
