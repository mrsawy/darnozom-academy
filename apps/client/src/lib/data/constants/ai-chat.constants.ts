/**
 * Max JSON body size for POST /api/chat (browser → Next → Nest).
 * Nest uses `json({ limit: '5mb' })` in main.ts — stay safely under that.
 */
export const AI_CHAT_MAX_REQUEST_BYTES = Math.floor(4.5 * 1024 * 1024);

export const AI_CHAT_MAX_REQUEST_SIZE_MB = 4.5;
