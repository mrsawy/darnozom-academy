import { DateTime } from 'luxon';

/** Default authoring timezone applied when a slot omits one (migration window). */
export const DEFAULT_SESSION_TIMEZONE = process.env.DEFAULT_SESSION_TZ ?? 'Africa/Cairo';

export interface HourMinute {
  hour: number;
  minute: number;
}

export interface SlotInstants {
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}

/**
 * Parse a time string into 24-hour components.
 * Accepts both `"HH:mm"` (24h, as produced by `<input type="time">`) and the
 * legacy `"h:mm am/pm"` format. Throws on anything else.
 */
export function parseTimeToHourMinute(time: string): HourMinute {
  const t = time.trim();

  const ampm = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(t);
  if (ampm) {
    let hour = Number.parseInt(ampm[1], 10);
    const minute = Number.parseInt(ampm[2], 10);
    const meridiem = ampm[3].toLowerCase();
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (hour > 23 || minute > 59) throw new Error(`Invalid time: ${time}`);
    return { hour, minute };
  }

  const h24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (h24) {
    const hour = Number.parseInt(h24[1], 10);
    const minute = Number.parseInt(h24[2], 10);
    if (hour > 23 || minute > 59) throw new Error(`Invalid time: ${time}`);
    return { hour, minute };
  }

  throw new Error(`Invalid time format: "${time}"`);
}

/**
 * Convert a wall-clock date + time authored in an IANA timezone into an absolute
 * UTC instant. This is the single source of truth for private-session time
 * conversion — DST is handled correctly by luxon (e.g. Africa/Cairo summer time).
 *
 * @param date  Calendar date as `"YYYY-MM-DD"`.
 * @param time  `"HH:mm"` or `"h:mm am/pm"`.
 * @param zone  IANA timezone, e.g. `"Africa/Cairo"`.
 */
export function wallTimeToUtc(date: string, time: string, zone: string): Date {
  const { hour, minute } = parseTimeToHourMinute(time);
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10));

  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone });
  if (!dt.isValid) {
    throw new Error(`Invalid date/timezone: "${date}" "${zone}" (${dt.invalidReason ?? 'unknown'})`);
  }
  return dt.toUTC().toJSDate();
}

/**
 * Build the `{ startsAt, endsAt, timezone }` instant triple for a slot from its
 * wall-clock date + start/end time. Applies {@link DEFAULT_SESSION_TIMEZONE} when
 * no zone is supplied.
 *
 * @param date  `"YYYY-MM-DD"`.
 */
export function buildSlotInstants(date: string, startTime: string, endTime: string, timezone?: string): SlotInstants {
  const zone = timezone ?? DEFAULT_SESSION_TIMEZONE;
  return {
    startsAt: wallTimeToUtc(date, startTime, zone),
    endsAt: wallTimeToUtc(date, endTime, zone),
    timezone: zone,
  };
}

/**
 * Render a UTC instant back into its authoring zone as `{ date, time24 }`.
 * Used by responses and by the edit form to re-hydrate slots.
 */
export function utcToWallTime(instant: Date, zone: string): { date: string; time24: string } {
  const dt = DateTime.fromJSDate(instant, { zone });
  return { date: dt.toFormat('yyyy-MM-dd'), time24: dt.toFormat('HH:mm') };
}

/** How early a participant may join before `startsAt`. Single source of truth — see design §6/§7. */
export const EARLY_JOIN_MINUTES = 15;

/**
 * A booking/slot is "ended" once `endsAt` has passed. There is deliberately no
 * scheduler that flips a persisted status — every reader (server, web, mobile)
 * must derive "ended" the same way from this helper.
 */
export function isSessionEnded(endsAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > endsAt.getTime();
}

/**
 * Whether a session can be joined right now: from `EARLY_JOIN_MINUTES` before
 * `startsAt` through `endsAt` (inclusive of both boundaries).
 */
export function isJoinable(startsAt: Date, endsAt: Date, now: Date = new Date(), earlyJoinMinutes = EARLY_JOIN_MINUTES): boolean {
  const joinableFrom = startsAt.getTime() - earlyJoinMinutes * 60_000;
  return now.getTime() >= joinableFrom && !isSessionEnded(endsAt, now);
}
