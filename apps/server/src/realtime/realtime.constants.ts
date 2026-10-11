export { RealtimeEvents } from '@darnozom/shared-types';

export const RealtimeRooms = {
  user: (userId: string) => `user:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
} as const;
