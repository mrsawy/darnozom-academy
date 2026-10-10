import { Currency } from './currency.enum';

/** ISO 3166-1 alpha-2 country codes that map to a non-USD currency we support. */
const COUNTRY_CODE_TO_CURRENCY: Readonly<Record<string, Currency>> = {
  EG: Currency.EGP,
  SA: Currency.SAR,
};

/** Cloudflare's placeholders for unknown (`XX`) and Tor (`T1`) traffic. */
const UNKNOWN_COUNTRY_CODES = new Set(['XX', 'T1']);

/**
 * Maps an ISO alpha-2 country code (e.g. Cloudflare's `CF-IPCountry`) to a supported currency.
 * Known countries without a dedicated currency fall back to USD; a missing/unknown code
 * falls back to `Currency.DEFAULT`.
 */
export function currencyFromCountryCode(countryCode?: string | null): Currency {
  const code = countryCode?.trim().toUpperCase();
  if (!code || code.length !== 2 || UNKNOWN_COUNTRY_CODES.has(code)) return Currency.DEFAULT;
  return COUNTRY_CODE_TO_CURRENCY[code] ?? Currency.USD;
}
