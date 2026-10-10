import { FieldErrors } from 'react-hook-form';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

export function extractErrorMessages(
  errors: FieldErrors,
  prefix: string[] = [],
  visited = new WeakSet()
): string[] {
  if (!isPlainObject(errors)) return [];

  if (visited.has(errors)) return [];
  visited.add(errors);

  let messages: string[] = [];

  for (const key in errors) {
    const value = errors[key];

    // Case 1: direct error message
    if (
      value &&
      typeof value === 'object' &&
      'message' in value &&
      typeof value.message === 'string'
    ) {
      messages.push(`${[...prefix, key].join('.')}: ${value.message}`);
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const pathSeg = [...prefix, key, String(index)];
        if (!item || typeof item !== 'object') return;
        // Top-level FieldError on the array item (rare)
        if ('message' in item && typeof (item as { message: unknown }).message === 'string') {
          messages.push(`${pathSeg.join('.')}: ${(item as { message: string }).message}`);
        }
        // Nested field errors, e.g. offlineSchedule[0].endTime.message
        if (isPlainObject(item)) {
          messages = [...messages, ...extractErrorMessages(item as FieldErrors, pathSeg, visited)];
        }
      });
      continue;
    }

    // Case 2: nested plain object (skip DOM objects like CSSStyleSheet, HTMLElement, etc.)
    if (isPlainObject(value)) {
      messages = [
        ...messages,
        ...extractErrorMessages(value as FieldErrors, [...prefix, key], visited),
      ];
    }
  }

  return messages;
}
