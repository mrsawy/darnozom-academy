import { describe, expect, it } from 'vitest';
import { Currency } from '@darnozom/shared-types';
import { formatMoney, parseMoney } from './format-money';

describe('formatMoney', () => {
  it('shows minor units as a two-decimal amount', () => {
    expect(formatMoney(10_000, Currency.EGP, 'en')).toContain('100');
    expect(formatMoney(1010, Currency.EGP, 'en')).toContain('10.10');
  });

  it('shows zero rather than an empty string, so a scholarship reads as free', () => {
    expect(formatMoney(0, Currency.EGP, 'en')).toContain('0');
  });

  it('never renders a negative balance as a bare minus with no number', () => {
    expect(formatMoney(-500, Currency.EGP, 'en')).toMatch(/5/);
  });
});

describe('parseMoney', () => {
  it('turns a typed amount into integer minor units', () => {
    expect(parseMoney('100')).toBe(10_000);
    expect(parseMoney('10.1')).toBe(1010);
    expect(parseMoney('0.07')).toBe(7);
  });

  it('accepts zero, which an accountant types for a full scholarship', () => {
    expect(parseMoney('0')).toBe(0);
  });

  it('returns null for anything it cannot read, rather than guessing at money', () => {
    for (const input of ['', 'abc', '-5', '1.2.3']) {
      expect(parseMoney(input)).toBeNull();
    }
  });

  it('ignores thousands separators and surrounding spaces', () => {
    expect(parseMoney(' 1,234.56 ')).toBe(123_456);
  });
});
