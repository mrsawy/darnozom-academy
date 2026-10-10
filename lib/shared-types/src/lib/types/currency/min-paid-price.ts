import { Currency } from './currency.enum';

/**
 * Minimum allowed price for a paid course billing cycle, per currency (roughly 1 USD).
 * Covers the fixed payment-gateway fee so a sale never nets the platform nothing.
 * A price of exactly 0 is treated as free and is not subject to the minimum.
 */
export const MIN_PAID_PRICE: Record<Currency, number> = {
  [Currency.EGP]: 30,
  [Currency.SAR]: 4,
  [Currency.USD]: 1,
};

/** Price a buyer actually pays once the percentage discount is applied. */
export function getPriceAfterDiscount(price: number, discountPercentage?: number | null): number {
  const discount = discountPercentage ?? 0;
  return +(price * (1 - discount / 100)).toFixed(2);
}

/** True when a paid (price > 0) cycle falls below the minimum, before or after discount. */
export function isBelowMinPaidPrice(
  price: number | null | undefined,
  currency: Currency | string | null | undefined,
  discountPercentage?: number | null
): boolean {
  if (price == null || !currency || price <= 0) return false;
  const min = MIN_PAID_PRICE[currency as Currency];
  if (min === undefined) return false;
  return getPriceAfterDiscount(price, discountPercentage) < min;
}
