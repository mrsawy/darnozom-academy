/**
 * First-strong direction detection (Arabic vs Latin) for inputs and chat bubbles.
 */
export function getTextDirection(value: string): 'rtl' | 'ltr' | null {
  const trimmed = value?.trimStart();
  if (!trimmed) return null;
  // Arabic Unicode range: \u0600-\u06FF, \u0750-\u077F, \uFB50-\uFDFF, \uFE70-\uFEFF
  const arabicPattern = /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(trimmed) ? 'rtl' : 'ltr';
}

export function getDir(value: string, locale: string): 'rtl' | 'ltr' {
  return getTextDirection(value) ?? (locale === 'ar' ? 'rtl' : 'ltr');
}

/** Text used for direction: assistant `text` + `reasoning` parts; user `text` parts only. */
export function getDirectionSourceFromMessageParts(
  content: readonly { type: string; text?: string }[]
): string {
  if (!content?.length) return '';
  const chunks: string[] = [];
  for (const part of content) {
    if (part.type === 'text' && typeof part.text === 'string') {
      chunks.push(part.text);
    } else if (part.type === 'reasoning') {
      const t = (part as { text?: string }).text;
      if (typeof t === 'string') chunks.push(t);
    }
  }
  return chunks.join('');
}
