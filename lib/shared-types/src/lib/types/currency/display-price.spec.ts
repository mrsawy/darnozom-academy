import { describe, expect, it } from 'vitest';
import { Currency } from './currency.enum';
import { getDisplayPrice } from './display-price';

const rates = { [Currency.EGP]: 50, [Currency.SAR]: 3.75, [Currency.USD]: 1 };

describe('getDisplayPrice', () => {
  it('uses the original price when the viewer currency matches', () => {
    expect(
      getDisplayPrice({ price: 4000, currency: Currency.EGP, priceUSD: 80 }, Currency.EGP, rates)
    ).toEqual({ amount: 4000, currency: Currency.EGP });
  });

  it('converts through priceUSD for a different viewer currency', () => {
    expect(
      getDisplayPrice({ price: 4000, currency: Currency.EGP, priceUSD: 80 }, Currency.SAR, rates)
    ).toEqual({ amount: 300, currency: Currency.SAR });
  });

  it('returns priceUSD as-is for USD viewers', () => {
    expect(
      getDisplayPrice({ price: 4000, currency: Currency.EGP, priceUSD: 80 }, Currency.USD, rates)
    ).toEqual({ amount: 80, currency: Currency.USD });
  });

  it('rounds converted amounts to 2 decimals', () => {
    expect(
      getDisplayPrice({ price: 10, currency: Currency.USD, priceUSD: 10.123 }, Currency.SAR, rates)
    ).toEqual({ amount: 37.96, currency: Currency.SAR });
  });

  it('falls back to the original price when the rate or priceUSD is unknown', () => {
    const source = { price: 4000, currency: Currency.EGP, priceUSD: 80 };
    expect(getDisplayPrice(source, Currency.SAR, {})).toEqual({ amount: 4000, currency: Currency.EGP });
    expect(getDisplayPrice(source, Currency.SAR, undefined)).toEqual({
      amount: 4000,
      currency: Currency.EGP,
    });
    expect(
      getDisplayPrice({ price: 4000, currency: Currency.EGP }, Currency.SAR, rates)
    ).toEqual({ amount: 4000, currency: Currency.EGP });
  });

  it('returns null when there is no price at all', () => {
    expect(getDisplayPrice({ price: null, currency: Currency.EGP }, Currency.SAR, rates)).toBeNull();
  });
});
