import 'server-only';
import { headers } from 'next/headers';
import { currencyFromCountryCode, type Currency } from '@darnozom/shared-types';

/**
 * Suggested currency for the current visitor, derived from the `CF-IPCountry`
 * header Cloudflare adds to every proxied request. Missing in local dev, in
 * which case the platform default is returned.
 */
export async function getRequestCurrency(): Promise<Currency> {
  const requestHeaders = await headers();
  return currencyFromCountryCode(requestHeaders.get('cf-ipcountry'));
}
