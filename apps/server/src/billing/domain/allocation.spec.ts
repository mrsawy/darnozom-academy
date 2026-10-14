import { Currency } from '@darnozom/shared-types';
import { allocateFifo, OpenCharge, outstandingOf } from './allocation';

const charge = (id: string, amountMinor: number, overrides: Partial<OpenCharge> = {}): OpenCharge => ({
  chargeLedgerEntryId: id,
  currency: Currency.EGP,
  dueAt: new Date('2026-03-01T00:00:00.000Z'),
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  amountMinor,
  alreadyAllocatedMinor: 0,
  ...overrides,
});

describe('outstandingOf', () => {
  it('is the charge less what is already allocated', () => {
    expect(outstandingOf(charge('c1', 10_000, { alreadyAllocatedMinor: 4000 }))).toBe(6000);
  });

  it('never goes below zero, even if over-allocated by a correction', () => {
    expect(outstandingOf(charge('c1', 10_000, { alreadyAllocatedMinor: 12_000 }))).toBe(0);
  });
});

describe('allocateFifo', () => {
  it('settles the oldest-due charge first', () => {
    const result = allocateFifo(10_000, Currency.EGP, [
      charge('later', 10_000, { dueAt: new Date('2026-04-01T00:00:00.000Z') }),
      charge('earlier', 10_000, { dueAt: new Date('2026-03-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'earlier', amountMinor: 10_000 }]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('falls back to creation order when two charges share a due date', () => {
    const due = new Date('2026-03-01T00:00:00.000Z');
    const result = allocateFifo(5000, Currency.EGP, [
      charge('second', 10_000, { dueAt: due, createdAt: new Date('2026-02-10T00:00:00.000Z') }),
      charge('first', 10_000, { dueAt: due, createdAt: new Date('2026-02-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations[0].chargeLedgerEntryId).toBe('first');
  });

  it('treats a charge with no due date as the last to settle', () => {
    const result = allocateFifo(5000, Currency.EGP, [
      charge('undated', 10_000, { dueAt: null }),
      charge('dated', 10_000, { dueAt: new Date('2026-05-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations[0].chargeLedgerEntryId).toBe('dated');
  });

  it('spreads one payment across several charges', () => {
    const result = allocateFifo(15_000, Currency.EGP, [
      charge('a', 10_000, { dueAt: new Date('2026-03-01T00:00:00.000Z') }),
      charge('b', 10_000, { dueAt: new Date('2026-04-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([
      { chargeLedgerEntryId: 'a', amountMinor: 10_000 },
      { chargeLedgerEntryId: 'b', amountMinor: 5000 },
    ]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('leaves the rest of a partly covered charge owed', () => {
    const result = allocateFifo(4000, Currency.EGP, [charge('a', 10_000)]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'a', amountMinor: 4000 }]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('keeps an over-payment as an unallocated credit rather than losing it', () => {
    const result = allocateFifo(25_000, Currency.EGP, [charge('a', 10_000)]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'a', amountMinor: 10_000 }]);
    expect(result.unallocatedMinor).toBe(15_000);
  });

  it('allocates nothing when there is no open charge, and keeps the whole credit', () => {
    const result = allocateFifo(10_000, Currency.EGP, []);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('skips a charge that is already fully covered', () => {
    const result = allocateFifo(5000, Currency.EGP, [
      charge('covered', 10_000, { alreadyAllocatedMinor: 10_000, dueAt: new Date('2026-03-01T00:00:00.000Z') }),
      charge('open', 10_000, { dueAt: new Date('2026-04-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'open', amountMinor: 5000 }]);
  });

  it('never settles a charge in another currency', () => {
    const result = allocateFifo(10_000, Currency.EGP, [
      charge('usd', 10_000, { currency: Currency.USD, dueAt: new Date('2026-03-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedMinor).toBe(10_000);
  });

  it('settles only the matching currency when a family owes in two', () => {
    const result = allocateFifo(12_000, Currency.EGP, [
      charge('usd', 10_000, { currency: Currency.USD, dueAt: new Date('2026-02-01T00:00:00.000Z') }),
      charge('egp', 10_000, { currency: Currency.EGP, dueAt: new Date('2026-03-01T00:00:00.000Z') }),
    ]);
    expect(result.allocations).toEqual([{ chargeLedgerEntryId: 'egp', amountMinor: 10_000 }]);
    expect(result.unallocatedMinor).toBe(2000);
  });

  it('allocates nothing for a zero payment', () => {
    const result = allocateFifo(0, Currency.EGP, [charge('a', 10_000)]);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedMinor).toBe(0);
  });

  it('produces only positive allocation amounts, so no zero row is ever written', () => {
    const result = allocateFifo(10_000, Currency.EGP, [charge('a', 10_000), charge('b', 10_000)]);
    expect(result.allocations.every((allocation) => allocation.amountMinor > 0)).toBe(true);
  });
});
