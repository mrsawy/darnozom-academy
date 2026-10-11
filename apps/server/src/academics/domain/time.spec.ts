import { hasOverlap, isValidAvailability, isValidSchedule, mergeIntervals, parseHHmm, splitWeek } from './time';

describe('parseHHmm', () => {
  it('parses 24-hour times', () => {
    expect(parseHHmm('00:00')).toBe(0);
    expect(parseHHmm('09:30')).toBe(570);
    expect(parseHHmm('23:59')).toBe(1439);
  });
  it('rejects malformed times', () => {
    for (const bad of ['9:30', '24:00', '12:60', 'ab:cd', '']) expect(parseHHmm(bad)).toBeNull();
  });
  it('accepts 24:00 only as an end of day', () => {
    expect(parseHHmm('24:00', true)).toBe(1440);
  });
});

describe('interval helpers', () => {
  it('splits an interval that passes the end of the week', () => {
    expect(splitWeek(10050, 10110)).toEqual([[10050, 10080], [0, 30]]);
    expect(splitWeek(100, 200)).toEqual([[100, 200]]);
  });
  it('detects overlap even when a long interval hides behind a short one', () => {
    expect(hasOverlap([[0, 100], [10, 20], [50, 60]])).toBe(true);
    expect(hasOverlap([[0, 10], [10, 20]])).toBe(false);
  });
  it('merges touching and overlapping intervals', () => {
    expect(mergeIntervals([[2880, 2940], [2820, 2880], [0, 10]])).toEqual([[0, 10], [2820, 2940]]);
  });
});

describe('isValidSchedule', () => {
  it('requires at least one slot', () => {
    expect(isValidSchedule([])).toBe(false);
  });
  it('validates day, time and duration bounds', () => {
    expect(isValidSchedule([{ dayOfWeek: 7, startTime: '10:00', durationMinutes: 60 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 10 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 481 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:0', durationMinutes: 60 }])).toBe(false);
  });
  it('rejects overlapping slots, including across the week boundary', () => {
    expect(isValidSchedule([{ dayOfWeek: 1, startTime: '10:00', durationMinutes: 60 }, { dayOfWeek: 1, startTime: '10:30', durationMinutes: 60 }])).toBe(false);
    expect(isValidSchedule([{ dayOfWeek: 6, startTime: '23:30', durationMinutes: 60 }, { dayOfWeek: 0, startTime: '00:00', durationMinutes: 15 }])).toBe(false);
  });
  it('accepts two separate weekly slots', () => {
    expect(isValidSchedule([{ dayOfWeek: 6, startTime: '17:00', durationMinutes: 60 }, { dayOfWeek: 1, startTime: '17:00', durationMinutes: 60 }])).toBe(true);
  });
});

describe('isValidAvailability', () => {
  it('accepts an empty list', () => {
    expect(isValidAvailability([])).toBe(true);
  });
  it('accepts 24:00 as an end time', () => {
    expect(isValidAvailability([{ dayOfWeek: 6, startTime: '23:00', endTime: '24:00' }])).toBe(true);
  });
  it('rejects end <= start and same-day overlap', () => {
    expect(isValidAvailability([{ dayOfWeek: 1, startTime: '10:00', endTime: '10:00' }])).toBe(false);
    expect(isValidAvailability([{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }, { dayOfWeek: 1, startTime: '11:00', endTime: '13:00' }])).toBe(false);
  });
});
