/**
 * Returns a trimmed src string safe for `next/image`, or `null` if missing/invalid
 * (avoids `Failed to construct 'URL': Invalid URL` from the default loader).
 */
export function getRenderableImageSrc(src: unknown): string | null {
  if (typeof src !== 'string') return null;
  const s = src.trim();
  if (!s) return null;

  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (s.startsWith('/')) return s;
  if (s.startsWith('//')) {
    try {
      new URL(`https:${s}`);
      return s;
    } catch {
      return null;
    }
  }
  try {
    new URL(s);
    return s;
  } catch {
    return null;
  }
}
