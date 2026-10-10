const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com']);

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null;

  if (parsed.hostname === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return isValidId(id) ? id : null;
  }

  const v = parsed.searchParams.get('v');
  if (v && isValidId(v)) return v;

  const parts = parsed.pathname.split('/').filter(Boolean);
  const embedIdx = parts.indexOf('embed');
  if (embedIdx !== -1 && parts[embedIdx + 1] && isValidId(parts[embedIdx + 1])) return parts[embedIdx + 1];
  const shortsIdx = parts.indexOf('shorts');
  if (shortsIdx !== -1 && parts[shortsIdx + 1] && isValidId(parts[shortsIdx + 1])) return parts[shortsIdx + 1];

  return null;
}

function isValidId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}
