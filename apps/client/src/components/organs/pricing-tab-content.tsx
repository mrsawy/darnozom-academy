import { Badge } from '@/components/atoms/badge';
import { formatPriceWithCurrency, PriceWithCurrency } from '@/components/atoms/price-with-currency';
import { TabsContent } from '@/components/atoms/tabs';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PricingDetails } from '@/lib/types/course/course.interface';
import { Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import type { DisplayPrice } from '@darnozom/shared-types';
import { getDiscountedPrice, isDiscountActive } from '@/lib/utils/discount.utils';

interface PricingTabContentProps {
  type: BillingCycle;
  pricing: PricingDetails;
  timeLeft: { days: number; hours: number; minutes: number } | null;
  isSelected: boolean;
  monthlySavings?: number;
  /** Base (pre-discount) price already converted to the viewer's currency. */
  display: DisplayPrice;
}

const PricingTabContent = React.memo<PricingTabContentProps>(
  ({ type, pricing, timeLeft, isSelected, monthlySavings, display }: PricingTabContentProps) => {
    const t = useTranslations('PricingTabContent');
    const tCurrency = useTranslations('CourseDataTable.currency');

    const { amount: mainPrice, currency } = display;
    const discountActive = isDiscountActive(pricing);
    const discountedPrice = discountActive ? getDiscountedPrice(mainPrice, pricing) : mainPrice;

    return (
      <TabsContent value={type} className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">
            <PriceWithCurrency amount={discountedPrice} currency={currency} />
            {type === BillingCycle.MONTHLY && (
              <span className="text-lg font-normal">{t('perMonth')}</span>
            )}
            {type === BillingCycle.YEARLY && (
              <span className="text-lg font-normal">{t('perYear')}</span>
            )}
          </span>
          {discountActive ? (
            <>
              <span className="text-muted-foreground text-lg line-through">
                <PriceWithCurrency amount={mainPrice} currency={currency} />
              </span>
              <Badge variant="destructive">
                {t('discountOff', { percent: pricing.discountPercentage ?? 0 })}
              </Badge>
            </>
          ) : null}
        </div>

        {discountActive && timeLeft && isSelected ? (
          <div className="text-destructive flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4" />
            <span>
              {t('timeLeftAtPrice', {
                days: timeLeft.days,
                hours: timeLeft.hours,
                minutes: timeLeft.minutes,
              })}
            </span>
          </div>
        ) : null}

        {monthlySavings !== undefined && monthlySavings > 0 && (
          <p className="text-sm font-medium text-green-600">
            {t('yearlyVsMonthlySavings', {
              amount: formatPriceWithCurrency(monthlySavings, currency, (key) => tCurrency(key)),
            })}
          </p>
        )}
      </TabsContent>
    );
  }
);

PricingTabContent.displayName = 'PricingTabContent';
export default PricingTabContent;
