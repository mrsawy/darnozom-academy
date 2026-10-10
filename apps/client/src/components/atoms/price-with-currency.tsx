'use client';

import { cn } from '@/lib/utils';
import { Currency } from '@lms-organization/shared-types';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/** Lowercase `Currency` code keys under `CourseDataTable.currency` (next-intl). */
type CourseDataTableCurrencyMessageKey = 'usd' | 'egp' | 'aed' | 'sar' | 'kwd' | 'qar' | 'eur';

/** Same rules as {@link PriceWithCurrency}; use when you need a string (e.g. next-intl placeholders). */
export function formatPriceWithCurrency(
  amount: number,
  currency: Currency,
  translateCurrencyCode: (key: CourseDataTableCurrencyMessageKey) => string,
  fractionDigits = 2
): string {
  const formatted = amount.toFixed(fractionDigits);
  if (currency === Currency.USD) {
    return `$${formatted}`;
  }
  const code = (currency ?? Currency.DEFAULT).toLowerCase() as CourseDataTableCurrencyMessageKey;
  if (currency === Currency.EGP) {
    return ` ${formatted} ${translateCurrencyCode(code)}`;
  }
  return `${translateCurrencyCode(code)} ${formatted}`;
}

export interface PriceWithCurrencyProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number;
  currency: Currency;
  fractionDigits?: number;
}

export function PriceWithCurrency({
  amount,
  currency,
  fractionDigits = 2,
  className,
  ...props
}: PriceWithCurrencyProps) {
  const tCurrency = useTranslations('CourseDataTable.currency');
  const text = formatPriceWithCurrency(amount, currency, (key) => tCurrency(key), fractionDigits);

  return (
    <span className={cn(className)} {...props}>
      {text}
    </span>
  );
}
