/**
 * Recursively walks a nested react-hook-form `FieldErrors` object and returns
 * the `message` string of the first leaf error it encounters, or `null` if
 * the object contains no error messages.
 */
export function getFirstErrorMessage(obj: Record<string, unknown>): string | null {
  for (const value of Object.values(obj)) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    if ('message' in record && typeof record.message === 'string') {
      return record.message;
    }
    const nested = getFirstErrorMessage(record);
    if (nested) return nested;
  }
  return null;
}
