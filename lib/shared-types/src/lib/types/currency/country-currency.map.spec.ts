import { describe, expect, it } from 'vitest';
import { Currency } from './currency.enum';
import { currencyFromCountryCode } from './country-currency.map';

describe('currencyFromCountryCode', () => {
  it('maps supported countries to their currency', () => {
    expect(currencyFromCountryCode('EG')).toBe(Currency.EGP);
    expect(currencyFromCountryCode('SA')).toBe(Currency.SAR);
  });

  it('is case/whitespace insensitive', () => {
    expect(currencyFromCountryCode(' sa ')).toBe(Currency.SAR);
  });

  it('falls back to USD for other known countries', () => {
    expect(currencyFromCountryCode('US')).toBe(Currency.USD);
    expect(currencyFromCountryCode('DE')).toBe(Currency.USD);
  });

  it('falls back to the platform default for missing or unknown codes', () => {
    expect(currencyFromCountryCode()).toBe(Currency.DEFAULT);
    expect(currencyFromCountryCode(null)).toBe(Currency.DEFAULT);
    expect(currencyFromCountryCode('')).toBe(Currency.DEFAULT);
    expect(currencyFromCountryCode('XX')).toBe(Currency.DEFAULT);
    expect(currencyFromCountryCode('T1')).toBe(Currency.DEFAULT);
    expect(currencyFromCountryCode('EGY')).toBe(Currency.DEFAULT);
  });
});
