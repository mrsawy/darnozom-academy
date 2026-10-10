import { parseTimeToHourMinute, wallTimeToUtc, utcToWallTime, isSessionEnded, isJoinable, EARLY_JOIN_MINUTES } from './session-time.util';

describe('parseTimeToHourMinute', () => {
  it('parses 24-hour times', () => {
    expect(parseTimeToHourMinute('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeToHourMinute('23:05')).toEqual({ hour: 23, minute: 5 });
  });

  it('parses am/pm times', () => {
    expect(parseTimeToHourMinute('02:00 pm')).toEqual({ hour: 14, minute: 0 });
    expect(parseTimeToHourMinute('11:30 AM')).toEqual({ hour: 11, minute: 30 });
  });

  it('handles the 12 am/pm boundary', () => {
    expect(parseTimeToHourMinute('12:00 am')).toEqual({ hour: 0, minute: 0 });
    expect(parseTimeToHourMinute('12:15 pm')).toEqual({ hour: 12, minute: 15 });
  });

  it('throws on invalid input', () => {
    expect(() => parseTimeToHourMinute('25:00')).toThrow();
    expect(() => parseTimeToHourMinute('nonsense')).toThrow();
  });
});

describe('wallTimeToUtc', () => {
  it('applies the standard (winter) offset for Africa/Cairo (+02:00)', () => {
    // 2026-01-15 10:00 Cairo standard time → 08:00 UTC
    const utc = wallTimeToUtc('2026-01-15', '10:00', 'Africa/Cairo');
    expect(utc.toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });

  it('applies DST (summer) offset for Africa/Cairo (+03:00)', () => {
    // 2026-07-15 10:00 Cairo summer time → 07:00 UTC
    const utc = wallTimeToUtc('2026-07-15', '10:00', 'Africa/Cairo');
    expect(utc.toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });

  it('treats UTC as a passthrough', () => {
    const utc = wallTimeToUtc('2026-03-01', '13:45', 'UTC');
    expect(utc.toISOString()).toBe('2026-03-01T13:45:00.000Z');
  });

  it('accepts legacy am/pm strings', () => {
    const utc = wallTimeToUtc('2026-01-15', '10:00 am', 'Africa/Cairo');
    expect(utc.toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });

  it('throws on an invalid timezone', () => {
    expect(() => wallTimeToUtc('2026-01-15', '10:00', 'Not/AZone')).toThrow();
  });
});

describe('utcToWallTime', () => {
  it('round-trips an instant back into the authoring zone', () => {
    const instant = new Date('2026-07-15T07:00:00.000Z');
    expect(utcToWallTime(instant, 'Africa/Cairo')).toEqual({ date: '2026-07-15', time24: '10:00' });
  });
});

describe('isSessionEnded', () => {
  const endsAt = new Date('2026-07-15T10:00:00.000Z');

  it('is false while the session is still running', () => {
    expect(isSessionEnded(endsAt, new Date('2026-07-15T09:59:59.000Z'))).toBe(false);
  });

  it('is false at the exact end instant', () => {
    expect(isSessionEnded(endsAt, new Date('2026-07-15T10:00:00.000Z'))).toBe(false);
  });

  it('is true once the end instant has passed', () => {
    expect(isSessionEnded(endsAt, new Date('2026-07-15T10:00:00.001Z'))).toBe(true);
  });
});

describe('isJoinable', () => {
  const startsAt = new Date('2026-07-15T10:00:00.000Z');
  const endsAt = new Date('2026-07-15T11:00:00.000Z');

  it('is false before the early-join window opens', () => {
    const justBeforeWindow = new Date(startsAt.getTime() - (EARLY_JOIN_MINUTES * 60_000 + 1000));
    expect(isJoinable(startsAt, endsAt, justBeforeWindow)).toBe(false);
  });

  it('is true right as the early-join window opens', () => {
    const windowOpen = new Date(startsAt.getTime() - EARLY_JOIN_MINUTES * 60_000);
    expect(isJoinable(startsAt, endsAt, windowOpen)).toBe(true);
  });

  it('is true while the session is in progress', () => {
    expect(isJoinable(startsAt, endsAt, new Date('2026-07-15T10:30:00.000Z'))).toBe(true);
  });

  it('is false once the session has ended', () => {
    expect(isJoinable(startsAt, endsAt, new Date('2026-07-15T11:00:00.001Z'))).toBe(false);
  });
});
