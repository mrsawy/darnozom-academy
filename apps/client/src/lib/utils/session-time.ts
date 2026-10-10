/**
 * Client-side helpers for private-session instants. Times come from the server as
 * absolute UTC instants (`startsAt`/`endsAt`) plus the IANA `timezone` they were
 * authored in. Join-window logic mirrors the server (`session-time.util.ts`) so all
 * surfaces agree on when a session is joinable.
 */

/** How early a participant may join before `startsAt`. Must match the server. */
export const EARLY_JOIN_MINUTES = 15;

export type JoinState = 'scheduled' | 'joinable' | 'ended';

export interface JoinInfo {
  state: JoinState;
  /** Whether the join button should be enabled right now. */
  canJoin: boolean;
  /** Milliseconds until the join window opens (0 once open). */
  msUntilJoinable: number;
}

/** True only for a value that parses to a real calendar instant. */
export function isValidInstant(value: string | Date | null | undefined): value is string | Date {
  if (value === null || value === undefined) return false;
  return Number.isFinite(new Date(value).getTime());
}

/** True once the end instant has strictly passed. */
export function isSessionEnded(endsAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() > new Date(endsAt).getTime();
}

/**
 * True while a session may be joined: from `EARLY_JOIN_MINUTES` before `startsAt`
 * through `endsAt` (inclusive).
 */
export function isJoinable(
  startsAt: string | Date,
  endsAt: string | Date,
  now: Date = new Date()
): boolean {
  const opensAt = new Date(startsAt).getTime() - EARLY_JOIN_MINUTES * 60_000;
  return now.getTime() >= opensAt && !isSessionEnded(endsAt, now);
}

/**
 * Resolve the full join state for a booking's instant window, or `null` when the
 * instants are missing or unparseable (e.g. a legacy row not yet migrated) —
 * callers should hide the join control rather than render a `NaN` countdown.
 */
export function getJoinInfo(
  startsAt: string | Date | null | undefined,
  endsAt: string | Date | null | undefined,
  now: Date = new Date()
): JoinInfo | null {
  if (!isValidInstant(startsAt) || !isValidInstant(endsAt)) return null;
  if (isSessionEnded(endsAt, now)) {
    return { state: 'ended', canJoin: false, msUntilJoinable: 0 };
  }
  if (isJoinable(startsAt, endsAt, now)) {
    return { state: 'joinable', canJoin: true, msUntilJoinable: 0 };
  }
  const opensAt = new Date(startsAt).getTime() - EARLY_JOIN_MINUTES * 60_000;
  return {
    state: 'scheduled',
    canJoin: false,
    msUntilJoinable: Math.max(0, opensAt - now.getTime()),
  };
}

/** Format a UTC instant as a date in the slot's authoring zone, e.g. "Mon, Jul 20, 2026". */
export function formatSlotDate(instant: string | Date, timezone: string, locale?: string): string {
  return new Date(instant).toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
}

/** Format a UTC instant as a time in the slot's authoring zone, e.g. "10:00 AM". */
export function formatSlotTime(instant: string | Date, timezone: string, locale?: string): string {
  return new Date(instant).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

/** Format a start–end range with the zone abbreviation, e.g. "10:00 AM – 11:00 AM GMT+3". */
export function formatSlotTimeRange(
  startsAt: string | Date,
  endsAt: string | Date,
  timezone: string,
  locale?: string
): string {
  const start = formatSlotTime(startsAt, timezone, locale);
  const end = formatSlotTime(endsAt, timezone, locale);
  const tzName = shortTimeZoneName(startsAt, timezone, locale);
  return `${start} – ${end}${tzName ? ` ${tzName}` : ''}`;
}

/** Short timezone label for a given instant, e.g. "GMT+3". Empty string if unavailable. */
export function shortTimeZoneName(
  instant: string | Date,
  timezone: string,
  locale?: string
): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date(instant));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** Extract a `<input type="date">` value ("YYYY-MM-DD") for an instant in the given zone. */
export function instantToDateInput(instant: string | Date, timezone: string): string {
  // en-CA renders ISO-like YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}

/** Extract a `<input type="time">` value ("HH:mm", 24h) for an instant in the given zone. */
export function instantToTimeInput(instant: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant));
}

/** The viewer's current IANA timezone, e.g. "Africa/Cairo". */
export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** Human "in 2h 15m" style countdown from a millisecond duration. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
