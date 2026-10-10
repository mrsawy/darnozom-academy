function toYouTubeEmbed(url: string) {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = regex.exec(url);

  if (!match) return url;

  const videoId = match[1];

  // Extract start time (t or start)
  const timeMatch = /[?&](t|start)=([\d]+)/.exec(url);
  const startTime = timeMatch ? timeMatch[2] : null;

  let embedUrl = `https://www.youtube.com/embed/${videoId}`;

  if (startTime) {
    embedUrl += `?start=${startTime}`;
  }

  return embedUrl;
}

export const formatTime = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
};

export default toYouTubeEmbed;
