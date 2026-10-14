import { Currency } from '@darnozom/shared-types';
import { isValidAmountMinor, sumMinor, toMajor, toMinor } from './money';

describe('toMinor', () => {
  it('converts a whole amount', () => {
    expect(toMinor(100, Currency.EGP)).toBe(10_000);
    expect(toMinor(100, Currency.USD)).toBe(10_000);
  });

  it('converts a two-decimal amount without floating-point drift', () => {
    expect(toMinor(10.1, Currency.EGP)).toBe(1010);
    expect(toMinor(0.07, Currency.EGP)).toBe(7);
    expect(toMinor(1234.56, Currency.USD)).toBe(123_456);
  });

  it('rounds a third decimal to the nearest minor unit rather than truncating money away', () => {
    expect(toMinor(1.005, Currency.EGP)).toBe(101);
    expect(toMinor(1.004, Currency.EGP)).toBe(100);
  });

  it('converts zero, which a full scholarship needs', () => {
    expect(toMinor(0, Currency.EGP)).toBe(0);
  });
});

describe('toMajor', () => {
  it('is the inverse of toMinor for any two-decimal amount', () => {
    for (const amount of [0, 0.07, 10.1, 100, 1234.56]) {
      expect(toMajor(toMinor(amount, Currency.EGP), Currency.EGP)).toBeCloseTo(amount, 2);
    }
  });
});

describe('isValidAmountMinor', () => {
  it('accepts zero and any positive integer', () => {
    expect(isValidAmountMinor(0)).toBe(true);
    expect(isValidAmountMinor(1)).toBe(true);
    expect(isValidAmountMinor(10_000)).toBe(true);
  });

  it('refuses a negative amount: direction is the entry type’s job, not the amount’s', () => {
    expect(isValidAmountMinor(-1)).toBe(false);
  });

  it('refuses a fraction of a minor unit', () => {
    expect(isValidAmountMinor(10.5)).toBe(false);
  });

  it('refuses anything that is not a finite number', () => {
    for (const value of ['100', null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isValidAmountMinor(value)).toBe(false);
    }
  });
});

describe('sumMinor', () => {
  it('sums to an exact integer, which a float sum would not', () => {
    expect(sumMinor([333, 333, 334])).toBe(1000);
  });

  it('sums an empty list to zero', () => {
    expect(sumMinor([])).toBe(0);
  });
});
