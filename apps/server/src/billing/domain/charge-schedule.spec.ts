import { SubscriptionType } from '@darnozom/shared-types';
import { initialCharges, monthlyChargeDueDates, monthlyIdempotencyKey } from './charge-schedule';

const SUB = 'sub1';
const MARCH = new Date('2026-03-15T00:00:00.000Z');
const APRIL = new Date('2026-04-01T00:00:00.000Z');

const item = (studentId: string, groupId: string, startDate = MARCH) => ({ studentId, groupId, startDate });

describe('initialCharges — FULL_COURSE', () => {
  it('posts one charge due at the cohort start', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.FULL_COURSE,
      amountMinor: 50_000,
      items: [item('s1', 'g1')],
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ amountMinor: 50_000, dueAt: MARCH, studentId: 's1', groupId: 'g1' });
  });
});

describe('initialCharges — MONTHLY', () => {
  it('posts the first month’s charge, due at the start', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.MONTHLY,
      amountMinor: 10_000,
      items: [item('s1', 'g1')],
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ amountMinor: 10_000, dueAt: MARCH });
  });

  it('gives the first month an idempotency key, so a job cannot post it twice', () => {
    const charges = initialCharges({
      subscriptionId: SUB,
      type: SubscriptionType.MONTHLY,
      amountMinor: 10_000,
      items: [item('s1', 'g1')],
    });
    expect(charges[0].idempotencyKey).toBe(monthlyIdempotencyKey(SUB, MARCH));
  });
});

describe('initialCharges — a zero amount on any type', () => {
  it('posts nothing, so nothing can divide by zero downstream', () => {
    for (const type of Object.values(SubscriptionType)) {
      expect(initialCharges({ subscriptionId: SUB, type, amountMinor: 0, items: [item('s1', 'g1'), item('s2', 'g2')] })).toEqual([]);
    }
  });
});

describe('monthlyChargeDueDates', () => {
  it('is empty before the second month', () => {
    expect(monthlyChargeDueDates(MARCH, 'Africa/Cairo', new Date('2026-03-20T00:00:00.000Z'))).toEqual([]);
  });

  it('gives the 1st of each month after the start month, up to now', () => {
    const dues = monthlyChargeDueDates(MARCH, 'Africa/Cairo', new Date('2026-05-05T00:00:00.000Z'));
    expect(dues).toHaveLength(2);
    expect(dues[0].toISOString()).toBe('2026-03-31T22:00:00.000Z');
    // Ruling: Egypt observes DST starting last Friday of April, so May 1 00:00 Cairo is UTC+3 (21:00 UTC).
    expect(dues[1].toISOString()).toBe('2026-04-30T21:00:00.000Z');
  });

  it('does not include a month whose 1st has not arrived yet', () => {
    const dues = monthlyChargeDueDates(MARCH, 'Africa/Cairo', new Date('2026-04-30T00:00:00.000Z'));
    expect(dues).toHaveLength(1);
  });

  it('is empty for a timezone it cannot read, so one bad group cannot stop the job', () => {
    expect(monthlyChargeDueDates(MARCH, 'Mars/Olympus', new Date('2026-05-05T00:00:00.000Z'))).toEqual([]);
  });
});

describe('idempotency keys', () => {
  it('gives a month exactly one key', () => {
    expect(monthlyIdempotencyKey(SUB, APRIL)).toBe(monthlyIdempotencyKey(SUB, APRIL));
    expect(monthlyIdempotencyKey(SUB, APRIL)).not.toBe(monthlyIdempotencyKey(SUB, MARCH));
  });

});
