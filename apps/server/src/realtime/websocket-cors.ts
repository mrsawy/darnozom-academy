/**
 * Socket.IO handshake validates `Origin` like HTTP CORS. Expo / React Native dev
 * clients use origins that are not https://safeerlms.com; without `CORS_ORIGINS`
 * they would fail with a generic client-side "websocket error".
 */
export function getWebSocketCorsOptions(): {
  origin: boolean | string[];
  credentials: boolean;
} {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return {
      origin: raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      credentials: true,
    };
  }
  if (process.env.NODE_ENV === 'production') {
    return {
      origin: ['https://safeerlms.com'],
      credentials: true,
    };
  }
  return {
    origin: true,
    credentials: true,
  };
}
