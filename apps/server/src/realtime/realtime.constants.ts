export { RealtimeEvents } from '@lms-organization/shared-types';

export const RealtimeRooms = {
  user: (userId: string) => `user:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
} as const;
