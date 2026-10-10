import { Currency } from './currency.enum';

/** Units of each currency per 1 USD (USD itself is 1), as served by `currency.getRates`. */
export type ExchangeRates = Partial<Record<Currency, number>>;

/** A stored price in its original currency, plus its USD equivalent when known. */
export interface PriceSource {
  price: number | null | undefined;
  currency: Currency | string | null | undefined;
  priceUSD?: number | null;
}

export interface DisplayPrice {
  amount: number;
  currency: Currency;
}

/**
 * Price shown to a viewer in their currency — the same rule the server uses when charging
 * (course `getCoursePrice`, private-session `convertSessionPrice`): the original price when
 * the currencies match, otherwise `priceUSD` converted at the current rate.
 * Falls back to the original price/currency when a conversion isn't possible, so we never
 * show a number in a currency we couldn't actually compute.
 */
export function getDisplayPrice(
  source: PriceSource,
  viewerCurrency: Currency,
  rates: ExchangeRates | null | undefined
): DisplayPrice | null {
  const { price, currency, priceUSD } = source;
  if (price == null || !currency) return null;

  const original: DisplayPrice = { amount: price, currency: currency as Currency };
  if (currency === viewerCurrency) return original;
  if (priceUSD == null) return original;
  if (viewerCurrency === Currency.USD) return { amount: priceUSD, currency: Currency.USD };

  const rate = rates?.[viewerCurrency];
  if (!rate) return original;
  return { amount: +(priceUSD * rate).toFixed(2), currency: viewerCurrency };
}
