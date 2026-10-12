import { generateSessions } from './session-generation';

const at = (iso: string) => new Date(iso);
const starts = (list: { startsAt: Date }[]) => list.map((s) => s.startsAt.toISOString());

describe('generateSessions', () => {
  it('generates one session per weekly slot, in order, from the start date', () => {
    const result = generateSessions(
      [
        { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 },
        { dayOfWeek: 4, startTime: '17:00', durationMinutes: 90 },
      ],
      'Asia/Riyadh',
      at('2026-10-12T00:00:00.000Z'), // a Monday
      3
    );
    expect(starts(result)).toEqual(['2026-10-12T14:00:00.000Z', '2026-10-15T14:00:00.000Z', '2026-10-19T14:00:00.000Z']);
    expect(result.map((s) => s.sequence)).toEqual([1, 2, 3]);
    expect(result[1].endsAt.toISOString()).toBe('2026-10-15T15:30:00.000Z');
  });

  it('starts at the first matching weekday when the start date is mid-week', () => {
    const result = generateSessions(
      [
        { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 },
        { dayOfWeek: 4, startTime: '17:00', durationMinutes: 60 },
      ],
      'Asia/Riyadh',
      at('2026-10-14T00:00:00.000Z'), // a Wednesday
      2
    );
    expect(starts(result)).toEqual(['2026-10-15T14:00:00.000Z', '2026-10-19T14:00:00.000Z']);
  });

  it('orders several slots on the same day by start time and stops exactly at totalSessions', () => {
    const result = generateSessions(
      [
        { dayOfWeek: 1, startTime: '18:00', durationMinutes: 60 },
        { dayOfWeek: 1, startTime: '09:00', durationMinutes: 60 },
      ],
      'UTC',
      at('2026-10-12T00:00:00.000Z'),
      3
    );
    expect(starts(result)).toEqual(['2026-10-12T09:00:00.000Z', '2026-10-12T18:00:00.000Z', '2026-10-19T09:00:00.000Z']);
  });

  it("applies each date's own UTC offset across a DST change", () => {
    const result = generateSessions(
      [{ dayOfWeek: 0, startTime: '10:00', durationMinutes: 60 }],
      'America/New_York',
      at('2026-10-25T00:00:00.000Z'), // Sunday; DST ends Sunday 2026-11-01
      3
    );
    expect(starts(result)).toEqual(['2026-10-25T14:00:00.000Z', '2026-11-01T15:00:00.000Z', '2026-11-08T15:00:00.000Z']);
    expect(result[1].endsAt.toISOString()).toBe('2026-11-01T16:00:00.000Z');
  });

  it('treats the start date as a calendar date in the group timezone, not a UTC instant', () => {
    const result = generateSessions(
      [{ dayOfWeek: 1, startTime: '09:00', durationMinutes: 60 }],
      'America/New_York',
      at('2026-10-12T00:00:00.000Z'),
      1
    );
    expect(starts(result)).toEqual(['2026-10-12T13:00:00.000Z']);
  });

  it('returns nothing for an empty schedule or a non-positive count', () => {
    expect(generateSessions([], 'UTC', at('2026-10-12T00:00:00.000Z'), 5)).toEqual([]);
    expect(generateSessions([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }], 'UTC', at('2026-10-12T00:00:00.000Z'), 0)).toEqual([]);
  });
});
