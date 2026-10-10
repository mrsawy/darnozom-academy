export const orUndefined = (v: string | undefined): string | undefined =>
  v && v.length > 0 ? v : undefined;

export const toSelectValue = (v: string): string => (v.length === 0 ? 'none' : v);

/**
 * The NestJS `GlobalExceptionFilter` wraps every HTTP error in a JSON envelope:
 *   { statusCode, message, error, timestamp, path }
 * The action layer passes the raw response body through as `err.message`, so we
 * unwrap it here before handing it to `translateApiMessage`.
 */
export const extractApiMessage = (raw: string): string => {
  if (!raw) return raw;
  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // not JSON — use as-is
  }
  return raw;
};
