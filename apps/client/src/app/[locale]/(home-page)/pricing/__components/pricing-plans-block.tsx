'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import PillTab from '@/components/molecules/public-site/pill-tab';
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

  const yearlyLabel =
    savePercent > 0
      ? `${t('yearly')} · ${t('toggleSaveHint', { percent: savePercent })}`
      : t('yearly');

  return (
    <div ref={blockRef} className={cn('flex flex-col items-center gap-9', className)}>
      {isError ? (
        <div className="border-dz-clay/50 bg-dz-clay/10 text-dz-clay w-full rounded-lg border px-4 py-3 text-sm">
          {error instanceof Error ? error.message : t('loadError')}
        </div>
      ) : null}

      {sorted.length > 0 && !isLoading ? (
        <div
          role="group"
          aria-label={t('billingToggleAria')}
          className="bg-dz-sand flex rounded-full p-1">
          <PillTab variant="ghost" isActive={!isAnnual} onClick={() => setIsAnnual(false)}>
            {t('monthly')}
          </PillTab>
          <PillTab variant="ghost" isActive={isAnnual} onClick={() => setIsAnnual(true)}>
            {yearlyLabel}
          </PillTab>
        </div>
      ) : null}

      {isLoading ? (
        <PricingPlansBlockSkeleton />
      ) : (
        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
          {sorted.map((plan, index) => (
            <PricingPlanCard
              key={plan._id}
              plan={plan}
              tierIndex={index}
              isAnnual={isAnnual}
              isPopular={index === popularIndex}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && isVisible && plans.length === 0 ? (
        <p className="text-dz-ink-soft text-sm">{t('empty')}</p>
      ) : null}
    </div>
  );
}
