/** Minimal shape required for discount calculations — avoids requiring the full PricingDetails with required fields. */
export interface DiscountInfo {
  discountPercentage?: number | null;
  discountStartDate?: Date | string | null;
  discountEndDate?: Date | string | null;
}

export function isDiscountActive(p: DiscountInfo): boolean {
  if (!p.discountPercentage || p.discountPercentage <= 0) return false;
  const now = new Date();
  if (p.discountStartDate && now < new Date(p.discountStartDate)) return false;
  if (p.discountEndDate && now > new Date(p.discountEndDate)) return false;
  return true;
}

export function getDiscountedPrice(basePrice: number, p: DiscountInfo): number {
  if (!isDiscountActive(p)) return basePrice;
  return +(basePrice * (1 - (p.discountPercentage ?? 0) / 100)).toFixed(2);
}
