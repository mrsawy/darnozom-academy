'use client';

import { useCallback } from 'react';
import {
  Currency,
  getDisplayPrice,
  type DisplayPrice,
  type PriceSource,
} from '@darnozom/shared-types';
import { useQuery } from '@/lib/utils';
import useUserStore from '@/lib/store/userStore';
import { getViewerCurrencyData } from '@/lib/actions/currency/currency.action';

export const currencyKeys = {
  viewer: () => ['currency', 'viewer'] as const,
};

/**
 * Currency the current viewer should see prices in — their preferredCurrency when logged in,
 * otherwise the geo-detected one — plus a converter that mirrors how the server charges.
 */
export function useViewerCurrency() {
  const preferredCurrency = useUserStore((s) => s.user?.preferredCurrency);
  const { data } = useQuery({
    queryKey: currencyKeys.viewer(),
    queryFn: getViewerCurrencyData,
    staleTime: 60 * 60 * 1000, // server refreshes rates hourly
  });

  const currency: Currency = preferredCurrency ?? data?.guestCurrency ?? Currency.DEFAULT;
  const rates = data?.rates;

  const toDisplayPrice = useCallback(
    (source: PriceSource): DisplayPrice | null => getDisplayPrice(source, currency, rates),
    [currency, rates]
  );

  return { currency, rates, toDisplayPrice };
}
