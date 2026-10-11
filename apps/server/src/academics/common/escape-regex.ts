/** Escapes RegExp metacharacters so user text is matched literally. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
