'use client';

import { Typography } from '@/components/atoms/typography';
import { Badge } from '@/components/atoms/badge';
import { PricingDetails, PricingSchema } from '@/lib/types/course/course.interface';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { Currency, getDisplayPrice } from '@darnozom/shared-types';
import { useViewerCurrency } from '@/lib/hooks/currency/use-viewer-currency.hook';
import { useTranslations } from 'next-intl';
import { getDiscountedPrice, isDiscountActive } from '@/lib/utils/discount.utils';

interface PriceProps {
  isPaid: boolean;
  pricing?: PricingSchema | PricingDetails;
  price?: string;
  /** Overrides the viewer's currency (defaults to preferredCurrency / geo-detected). */
  preferredCurrency?: Currency;
  className?: string;
}

/**
 * Formats a number according to currency locale
 * Optimized for EGP currency - no comma separators
 */
const formatPrice = (price: number, currency: Currency): string => {
  if (currency === Currency.EGP) {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: false,
    }).format(price);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * Gets the currency symbol/display for a given currency
 */
const getCurrencyDisplay = (
  currency: Currency,
  position: 'before' | 'after' = 'before'
): string => {
  switch (currency) {
    case Currency.USD: {
      return position === 'before' ? '$' : '';
    }
    case Currency.EGP: {
      return position === 'after' ? ' جنيه' : '';
    }
    default: {
      return position === 'before' ? `${currency} ` : '';
    }
  }
};

/**
 * Selects the best available pricing from PricingSchema
 * Priority: MONTHLY > YEARLY > ONE_TIME
 */
const selectPricingDetails = (pricing: PricingSchema): PricingDetails | null => {
  if (pricing[BillingCycle.MONTHLY]) return pricing[BillingCycle.MONTHLY];
  if (pricing[BillingCycle.YEARLY]) return pricing[BillingCycle.YEARLY];
  if (pricing[BillingCycle.ONE_TIME]) return pricing[BillingCycle.ONE_TIME];
  return null;
};

export default function Price({
  isPaid,
  pricing,
  price,
  preferredCurrency,
  className = '',
}: PriceProps) {
  const t = useTranslations('CourseCard');
  const { currency: viewerCurrency, rates } = useViewerCurrency();

  if (!isPaid) {
    return (
      <Typography
        variant="span"
        size="sm"
        weight="medium"
        className={`bg-dz-leaf rounded-lg p-0.5 px-1.5 text-start text-sm text-white sm:rounded-2xl sm:p-1 sm:px-2 sm:text-sm ${className}`}>
        {t('free')}
      </Typography>
    );
  }

  if (price) {
    return (
      <Typography
        variant="span"
        size="2xl"
        weight="bold"
        className={`text-start text-lg sm:text-2xl ${className}`}>
        {price}
      </Typography>
    );
  }

  if (!pricing) return null;

  let pricingDetails: PricingDetails | null = null;

  const hasBillingCycleKeys = 'MONTHLY' in pricing || 'YEARLY' in pricing || 'ONE_TIME' in pricing;
  const hasPricingDetailsKeys = 'originalPrice' in pricing && 'originalCurrency' in pricing;

  if (hasBillingCycleKeys && !hasPricingDetailsKeys) {
    pricingDetails = selectPricingDetails(pricing);
  } else if (hasPricingDetailsKeys) {
    pricingDetails = pricing;
  }

  if (!pricingDetails) return null;

  const display = getDisplayPrice(
    {
      price: pricingDetails.originalPrice,
      currency: pricingDetails.originalCurrency,
      priceUSD: pricingDetails.priceUSD,
    },
    preferredCurrency ?? viewerCurrency,
    rates
  );
  if (!display) return null;
  const basePrice = display.amount;
  const displayCurrency = display.currency;

  const discountActive = isDiscountActive(pricingDetails);
  const finalPrice = discountActive ? getDiscountedPrice(basePrice, pricingDetails) : basePrice;

  const formattedFinalPrice = formatPrice(finalPrice, displayCurrency);
  const formattedOriginalPrice = formatPrice(basePrice, displayCurrency);

  const currencyBefore = getCurrencyDisplay(displayCurrency, 'before');
  const currencyAfter = getCurrencyDisplay(displayCurrency, 'after');
  const isEGP = displayCurrency === Currency.EGP;

  const renderAmount = (amount: string, currency: Currency) => (
    <>
      {getCurrencyDisplay(currency, 'before')}
      {amount}
      {currency === Currency.EGP ? (
        <sup className="relative top-[-0.2em] mx-1 text-xs leading-none font-normal sm:text-sm">
          {getCurrencyDisplay(currency, 'after').trim()}
        </sup>
      ) : (
        getCurrencyDisplay(currency, 'after')
      )}
    </>
  );

  if (discountActive) {
    return (
      <div className={`flex flex-col gap-0.5 text-start ${className}`}>
        <div className="flex flex-col flex-wrap items-center gap-1.5">
          <Typography variant="span" size="2xl" weight="bold" className="text-lg sm:text-2xl">
            {renderAmount(formattedFinalPrice, displayCurrency)}
          </Typography>
          {pricingDetails.discountPercentage ? (
            <Badge variant="destructive" className="px-1.5 py-0.5 text-xs">
              {t('off', { percentage: pricingDetails.discountPercentage })}
            </Badge>
          ) : null}
        </div>
        <Typography variant="span" size="sm" color="muted" className="text-sm line-through">
          {renderAmount(formattedOriginalPrice, displayCurrency)}
        </Typography>
      </div>
    );
  }

  return (
    <Typography
      variant="span"
      size="2xl"
      weight="bold"
      className={`text-start text-lg sm:text-2xl ${className}`}>
      {currencyBefore}
      {formattedFinalPrice}
      {isEGP && currencyAfter ? (
        <sup className="relative top-[-0.2em] mx-1 text-xs leading-none font-normal sm:text-sm">
          {currencyAfter.trim()}
        </sup>
      ) : null}
      {!isEGP && currencyAfter}
    </Typography>
  );
}
