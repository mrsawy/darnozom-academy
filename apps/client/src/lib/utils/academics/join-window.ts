import { ATTENDANCE_OPEN_MINUTES_BEFORE, PRESENCE_GRACE_MINUTES, SessionStatus } from '@darnozom/shared-types';

const MINUTE_MS = 60_000;

/** Mirrors the server's join window: 15 minutes before the start to 15 minutes after the end; not once cancelled or completed. */
export function isJoinable(session: { status: SessionStatus; startsAt: string; endsAt: string }, now: Date = new Date()): boolean {
  if (session.status === SessionStatus.CANCELLED || session.status === SessionStatus.COMPLETED) return false;
  const opens = new Date(session.startsAt).getTime() - ATTENDANCE_OPEN_MINUTES_BEFORE * MINUTE_MS;
  const closes = new Date(session.endsAt).getTime() + PRESENCE_GRACE_MINUTES * MINUTE_MS;
  return now.getTime() >= opens && now.getTime() <= closes;
}
