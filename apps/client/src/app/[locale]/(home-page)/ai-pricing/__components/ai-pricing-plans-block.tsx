'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import PillTab from '@/components/molecules/public-site/pill-tab';
import { cn } from '@/lib/utils';
import { usePublicAiPlans } from '@/lib/hooks/ai-plans/useAiPlans';
import { useElementIsVisible } from '@/lib/hooks/use-element-is-visible';
import { type AiPlanResponse } from '@/lib/actions/ai-plan/ai-plan.action';
import { AiPlanCard } from '@/components/organs/ai-subscription-plans/ai-plan-card';
import { AiSubscriptionPlansSkeleton } from '@/components/organs/ai-subscription-plans/ai-subscription-plans.skeleton';

function maxSavingsPercent(plans: AiPlanResponse[]): number {
  let max = 0;
  for (const p of plans) {
    const m = p.price?.MONTHLY?.originalPrice ?? p.price?.MONTHLY?.priceUSD ?? 0;
    const y = p.price?.YEARLY?.originalPrice ?? p.price?.YEARLY?.priceUSD ?? 0;
    if (m > 0 && y > 0) {
      const pct = Math.round(((m * 12 - y) / (m * 12)) * 100);
      if (pct > max) max = pct;
    }
  }
  return max;
}

function popularIndex(count: number): number {
  if (count >= 3) return Math.floor(count / 2);
  if (count === 2) return 1;
  return -1;
}

interface AiPricingPlansBlockProps {
  className?: string;
}

export default function AiPricingPlansBlock({ className }: AiPricingPlansBlockProps) {
  const t = useTranslations('AiPricing');
  const [isAnnual, setIsAnnual] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const isVisible = useElementIsVisible(blockRef);
  const { data: plans = [], isLoading, isError, error } = usePublicAiPlans();

  const sorted = useMemo(
    () =>
      [...plans].toSorted((a, b) => {
        const aPrice = a.price?.MONTHLY?.priceUSD ?? 0;
        const bPrice = b.price?.MONTHLY?.priceUSD ?? 0;
        return aPrice - bPrice;
      }),
    [plans]
  );

  const savePercent = useMemo(() => maxSavingsPercent(sorted), [sorted]);
  const popular = popularIndex(sorted.length);

  const yearlyLabel =
    savePercent > 0
      ? `${t('yearly')} · ${t('toggleSaveHint', { percent: savePercent })}`
      : t('yearly');

  return (
    <div ref={blockRef} className={cn('flex w-full flex-col items-center gap-9', className)}>
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
        <AiSubscriptionPlansSkeleton />
      ) : (
        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
          {sorted.map((plan, index) => (
            <AiPlanCard
              key={plan._id}
              plan={plan}
              tierIndex={index}
              isAnnual={isAnnual}
              isPopular={index === popular}
              activeSubscription={null}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && isVisible && plans.length === 0 ? (
        <p className="text-dz-ink-soft text-sm">{t('noPlans')}</p>
      ) : null}
    </div>
  );
}
