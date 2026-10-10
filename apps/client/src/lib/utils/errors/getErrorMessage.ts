import { ALL_ERROR_KEYS_SET, CommonErrors } from '@lms-organization/shared-types';

/**
 * Extract a user-facing API message from an unknown error (Axios, Nest, plain Error).
 * Prefer `response.data.message` over Axios's generic "Request failed with status code …".
 */
export function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'An unexpected error occurred';
  }

  const err = error as {
    response?: { status?: number; data?: { message?: string | string[] } | string };
    message?: string;
  };

  if (err.response?.status === 429) {
    const data = err.response.data;
    if (typeof data === 'string') {
      try {
        const json = JSON.parse(data) as { message?: unknown };
        if (typeof json.message === 'string' && json.message) return json.message;
      } catch {
        // not JSON
      }
      return CommonErrors.TOO_MANY_REQUESTS;
    }
    const raw = data && typeof data === 'object' ? data.message : undefined;
    const message = Array.isArray(raw) ? raw[0] : raw;
    if (typeof message === 'string' && message.length > 0) {
      const key = message.split('|')[0] ?? '';
      if (ALL_ERROR_KEYS_SET.has(key)) return message;
      const match = /(\d+)\s*seconds?/i.exec(message);
      if (match) return `${CommonErrors.TOO_MANY_REQUESTS}|${match[1]}`;
    }
    return CommonErrors.TOO_MANY_REQUESTS;
  }

  const data = err.response?.data;
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const raw = data.message;
    if (typeof raw === 'string' && raw.length > 0) return raw;
    if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  }

  if (typeof err.message === 'string' && err.message.length > 0) {
    return err.message;
  }

  return 'An unexpected error occurred';
}
