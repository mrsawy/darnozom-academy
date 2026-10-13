import { milestoneInstant, reachedMilestones } from './milestones';

/** 2026-03-15, read as a local calendar date. */
const START = new Date('2026-03-15T00:00:00.000Z');

describe('milestoneInstant', () => {
  it('is local midnight the given number of days before the start date', () => {
    // Cairo is UTC+2 in March, so local midnight on the 8th is 22:00 UTC on the 7th.
    expect(milestoneInstant(START, 7, 'Africa/Cairo')).toEqual(new Date('2026-03-07T22:00:00.000Z'));
  });

  it('uses the offset of the milestone date, not of the start date', () => {
    // US DST begins 2026-03-08. Midnight on the 8th in New York is UTC-5; on the 14th it is UTC-4.
    expect(milestoneInstant(START, 7, 'America/New_York')).toEqual(new Date('2026-03-08T05:00:00.000Z'));
    expect(milestoneInstant(START, 1, 'America/New_York')).toEqual(new Date('2026-03-14T04:00:00.000Z'));
  });

  it('resolves to a single real instant when local midnight does not exist', () => {
    // Lord Howe skips 02:00-02:30, never midnight, so this only asserts the result is usable.
    const at = milestoneInstant(new Date('2026-10-11T00:00:00.000Z'), 7, 'Australia/Lord_Howe');
    expect(at).toBeInstanceOf(Date);
    expect(Number.isNaN(at!.getTime())).toBe(false);
  });

  it('returns null for a timezone it cannot read', () => {
    expect(milestoneInstant(START, 7, 'Mars/Olympus')).toBeNull();
    expect(milestoneInstant(START, 7, '')).toBeNull();
  });
});

describe('reachedMilestones', () => {
  it('is empty more than seven days out', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-01T12:00:00.000Z'))).toEqual([]);
  });

  it('reports the 7-day milestone once its local midnight has passed', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-07T23:00:00.000Z'))).toEqual([7]);
  });

  it('accumulates milestones as the start date approaches', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-12T05:00:00.000Z'))).toEqual([7, 3]);
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-03-14T05:00:00.000Z'))).toEqual([7, 3, 1]);
  });

  it('reports every milestone for a start date already in the past', () => {
    expect(reachedMilestones(START, 'Africa/Cairo', new Date('2026-04-01T00:00:00.000Z'))).toEqual([7, 3, 1]);
  });

  it('is empty for a timezone it cannot read, so one bad group cannot stop a sweep', () => {
    expect(reachedMilestones(START, 'Mars/Olympus', new Date('2026-04-01T00:00:00.000Z'))).toEqual([]);
  });
});
