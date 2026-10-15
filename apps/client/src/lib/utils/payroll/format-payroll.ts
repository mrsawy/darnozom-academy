import { Currency } from '@darnozom/shared-types';

export function formatPayrollAmount(
  amount: number,
  currency: Currency = Currency.SAR,
  locale = 'en'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
