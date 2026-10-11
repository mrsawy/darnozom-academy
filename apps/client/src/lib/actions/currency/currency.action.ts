'use server';

import type { Currency, ExchangeRates } from '@darnozom/shared-types';
import { createNatsRequest } from '@/lib/utils/createNatsRequest';
import { getRequestCurrency } from '@/lib/utils/geo/get-request-currency';

export interface ViewerCurrencyData {
  /** USD-based rates the server charges with. Empty when the server couldn't be reached. */
  rates: ExchangeRates;
  /** Geo-detected currency for visitors without a preferredCurrency (logged out). */
  guestCurrency: Currency;
}

export async function getViewerCurrencyData(): Promise<ViewerCurrencyData> {
  const [ratesResult, guestCurrency] = await Promise.all([
    createNatsRequest<{ rates: ExchangeRates }>('currency.getRates', {}).catch(() => null),
    getRequestCurrency(),
  ]);
  const rates = ratesResult && 'rates' in ratesResult ? ratesResult.rates : {};
  return { rates, guestCurrency };
}
