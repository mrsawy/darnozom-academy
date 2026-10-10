import { io, type Socket } from 'socket.io-client';
import { ACCESS_TOKEN_NAME, SESSION_ID_COOKIE_NAME } from '@lms-organization/shared-types';

/** Server → client realtime event names. Shared with the server so neither side drifts. */
export { RealtimeEvents } from '@lms-organization/shared-types';

export function getTokenFromCookie(cookieName: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return null;
}

export function getCurrentSid(): string | null {
  return getTokenFromCookie(SESSION_ID_COOKIE_NAME);
}

function resolveSocketBaseUrl(): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (wsBase && wsBase.trim().length > 0) return wsBase;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && apiUrl.trim().length > 0) return apiUrl;

  // Local fallback for dev when envs are not configured.
  return 'http://localhost:5000';
}

/** Opens the authenticated `/realtime` socket, or returns null when there is no access token. */
export function connectRealtimeSocket(): Socket | null {
  const token = getTokenFromCookie(ACCESS_TOKEN_NAME);
  if (!token) return null;

  const endpoint = `${resolveSocketBaseUrl().replace(/\/+$/, '')}/realtime`;
  return io(endpoint, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: { token },
  });
}
