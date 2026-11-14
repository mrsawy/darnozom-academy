import {
  AcademicsErrors,
  ATTENDANCE_OPEN_MINUTES_BEFORE,
  AttendanceStatus,
  AUTO_LATE_AFTER_MINUTES,
  PRESENCE_GRACE_MINUTES,
  SessionStatus,
} from '@darnozom/shared-types';

const MINUTE_MS = 60_000;

/** Heartbeats arrive every 60 s; a join later than two of them after the last one means the tab went away silently. */
export const PRESENCE_STALE_SECONDS = 150;

export interface PresenceSegment {
  joinedAt: Date;
  leftAt?: Date | null;
}

/** Joining is allowed from 15 minutes before the start until 15 minutes after the end; never for a cancelled session. */
export function checkJoinWindow(session: { status: SessionStatus; startsAt: Date; endsAt: Date }, now: Date): AcademicsErrors | null {
  if (session.status === SessionStatus.CANCELLED) return AcademicsErrors.JOIN_WINDOW_CLOSED;
  const opensAt = session.startsAt.getTime() - ATTENDANCE_OPEN_MINUTES_BEFORE * MINUTE_MS;
  const closesAt = session.endsAt.getTime() + PRESENCE_GRACE_MINUTES * MINUTE_MS;
  return now.getTime() < opensAt || now.getTime() > closesAt ? AcademicsErrors.JOIN_WINDOW_CLOSED : null;
}

/** PRESENT up to AUTO_LATE_AFTER_MINUTES after the start (inclusive), LATE after that. */
export function statusFromJoin(startsAt: Date, joinedAt: Date): AttendanceStatus.PRESENT | AttendanceStatus.LATE {
  const lateAfter = startsAt.getTime() + AUTO_LATE_AFTER_MINUTES * MINUTE_MS;
  return joinedAt.getTime() > lateAfter ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
}

/** An open segment ends at the last heartbeat; no segment counts past `cap`. */
export function totalSeconds(segments: PresenceSegment[], lastSeenAt: Date, cap: Date): number {
  let total = 0;
  for (const segment of segments) {
    const end = Math.min((segment.leftAt ?? lastSeenAt).getTime(), cap.getTime());
    const seconds = (end - segment.joinedAt.getTime()) / 1000;
    if (seconds > 0) total += seconds;
  }
  return Math.round(total);
}
