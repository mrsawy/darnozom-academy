'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Switch } from '@/components/atoms/switch';
import { cn } from '@/lib/utils';
import { usePricingPlans } from '@/lib/hooks/plan/usePricingPlans';
import { useElementIsVisible } from '@/lib/hooks/use-element-is-visible';
import { type PlanResponse } from '@/lib/actions/plan/plan.action';
import PricingPlanCard from './pricing-plan-card';
import { PricingPlansBlockSkeleton } from './pricing-plans-block.skeleton';

interface PricingPlansBlockProps {
  className?: string;
  cached?: boolean;
}

function sortPlansByLowestPrice(plans: PlanResponse[]): PlanResponse[] {
  return [...plans].toSorted((a, b) => getComparableAnnualPrice(a) - getComparableAnnualPrice(b));
}

function getComparableAnnualPrice(p: PlanResponse): number {
  const y = p.price?.YEARLY?.originalPrice ?? p.price?.YEARLY?.priceUSD ?? 0;
  const m = p.price?.MONTHLY?.originalPrice ?? p.price?.MONTHLY?.priceUSD ?? 0;
  if (y > 0) return y;
  if (m > 0) return m * 12;
  return 0;
}

function maxSavingsPercentAcrossPlans(plans: PlanResponse[]): number {
  let max = 0;
  for (const p of plans) {
    const m = p.price?.MONTHLY?.originalPrice ?? p.price?.MONTHLY?.priceUSD ?? 0;
    const y = p.price?.YEARLY?.originalPrice ?? p.price?.YEARLY?.priceUSD ?? 0;
    if (m > 0 && y > 0) {
      const monthlyTotal = m * 12;
      const pct = Math.round(((monthlyTotal - y) / monthlyTotal) * 100);
      if (pct > max) max = pct;
    }
  }
  return max;
}

function popularPlanIndex(count: number): number {
  if (count >= 3) return Math.floor(count / 2);
  if (count === 2) return 1;
  return -1;
}

export default function PricingPlansBlock({ className, cached = false }: PricingPlansBlockProps) {
  const t = useTranslations('HomeLegal.pricing.plans');
  const [isAnnual, setIsAnnual] = useState(true);
  const blockRef = useRef<HTMLDivElement>(null);
  const isVisible = useElementIsVisible(blockRef);
  const {
    data: plans = [],
    isLoading,
    isError,
    error,
  } = usePricingPlans({ enabled: isVisible, cached });

  const sorted = useMemo(() => sortPlansByLowestPrice(plans), [plans]);
  const savePercent = useMemo(() => maxSavingsPercentAcrossPlans(sorted), [sorted]);
  const popularIndex = popularPlanIndex(sorted.length);

  const gridClassName = cn(
    'grid gap-8',
    sorted.length === 1 && 'mx-auto max-w-md',
    sorted.length === 2 && 'md:grid-cols-2',
    sorted.length === 3 && 'lg:grid-cols-3',
    sorted.length >= 4 && 'sm:grid-cols-2 xl:grid-cols-4'
  );

  return (
    <div ref={blockRef} className={className}>
      {isError ? (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error instanceof Error ? error.message : t('loadError')}
        </div>
      ) : null}

      {sorted.length > 0 && !isLoading ? (
        <div className="light:glassy dir-ltr dark:bg-muted! mx-auto mb-10 flex max-w-lg flex-wrap items-center justify-center gap-3 rounded-full border px-4 py-3">
          <span
            className={cn(
              'text-sm font-medium',
              isAnnual ? 'text-muted-foreground' : 'text-foreground'
            )}>
            {t('monthly')}
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            aria-label={t('billingToggleAria')}
            className="data-[state=checked]:bg-primary dir-ltr"
          />
          <span
            className={cn(
              'text-sm font-medium',
              isAnnual ? 'text-foreground' : 'text-muted-foreground'
            )}>
            {t('yearly')}
          </span>
          {savePercent > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {t('toggleSaveHint', { percent: savePercent })}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <PricingPlansBlockSkeleton />
      ) : (
        <div className={gridClassName}>
          {sorted.map((plan, index) => (
            <PricingPlanCard
              key={plan._id}
              plan={plan}
              tierIndex={index}
              isAnnual={isAnnual}
              isPopular={index === popularIndex}
              visualVariant={
                index === 0 ? 'starter' : index === sorted.length - 1 ? 'enterprise' : 'pro'
              }
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && isVisible && plans.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-center text-sm">{t('empty')}</p>
      ) : null}
    </div>
  );
}
