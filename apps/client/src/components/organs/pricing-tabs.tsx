import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PricingSchema } from '@/lib/types/course/course.interface';
import React, { useMemo } from 'react';
import PricingTabContent from './pricing-tab-content';
import type { PricingDetails } from '@/lib/types/course/course.interface';
import { useViewerCurrency } from '@/lib/hooks/currency/use-viewer-currency.hook';
import { useTranslations } from 'next-intl';

interface PricingTabsProps {
  pricing: PricingSchema;
  selectedPricing: BillingCycle;
  onPricingChange: (pricing: BillingCycle) => void;
  timeLeft: { days: number; hours: number; minutes: number } | null;
}

const ORDERED_CYCLES = [BillingCycle.MONTHLY, BillingCycle.YEARLY, BillingCycle.ONE_TIME];

const PricingTabs = React.memo<PricingTabsProps>(
  ({ pricing, selectedPricing, onPricingChange, timeLeft }: PricingTabsProps) => {
    const t = useTranslations('CourseDataTable.billingCycles');
    const { toDisplayPrice } = useViewerCurrency();
    const displayOf = (details: PricingDetails) =>
      toDisplayPrice({
        price: details.originalPrice,
        currency: details.originalCurrency,
        priceUSD: details.priceUSD,
      });

    const availableCycles = useMemo(() => {
      return ORDERED_CYCLES.filter((cycle) => !!pricing[cycle]);
    }, [pricing]);

    const monthly = pricing.MONTHLY ? displayOf(pricing.MONTHLY) : null;
    const yearly = pricing.YEARLY ? displayOf(pricing.YEARLY) : null;
    // Only comparable when both cycles resolved to the same currency
    const monthlySavings =
      monthly && yearly && monthly.currency === yearly.currency
        ? +(monthly.amount * 12 - yearly.amount).toFixed(2)
        : undefined;

    if (availableCycles.length === 0) return null;

    const singleCycle = availableCycles.length === 1 ? availableCycles[0] : undefined;
    const singleCyclePricing = singleCycle ? pricing[singleCycle] : undefined;
    const singleDisplay = singleCyclePricing ? displayOf(singleCyclePricing) : null;

    return (
      <div className="bg-surface-container-lowest space-y-6">
        {availableCycles.length > 1 && (
          <Tabs
            value={selectedPricing}
            onValueChange={(value) => onPricingChange(value as BillingCycle)}>
            <div className="bg-muted/50 rounded-xl p-1">
              <TabsList
                className={`grid w-full ${availableCycles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} h-auto bg-transparent p-0`}>
                {availableCycles.map((type) => (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className="data-[state=active]:text-foreground text-muted-foreground rounded-lg py-2.5 text-sm font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    {t(type)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="mt-6">
              {availableCycles.map((type) => {
                const cyclePricing = pricing[type];
                const display = cyclePricing ? displayOf(cyclePricing) : null;
                if (!cyclePricing || !display) return null;
                return (
                  <PricingTabContent
                    key={type}
                    type={type}
                    pricing={cyclePricing}
                    timeLeft={timeLeft}
                    isSelected={type === selectedPricing}
                    monthlySavings={type === BillingCycle.YEARLY ? monthlySavings : undefined}
                    display={display}
                  />
                );
              })}
            </div>
          </Tabs>
        )}

        {singleCycle && singleCyclePricing && singleDisplay ? (
          <PricingTabContent
            type={singleCycle}
            pricing={singleCyclePricing}
            timeLeft={timeLeft}
            isSelected
            monthlySavings={undefined}
            display={singleDisplay}
          />
        ) : null}
      </div>
    );
  }
);

PricingTabs.displayName = 'PricingTabs';
export default PricingTabs;
