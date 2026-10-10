'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAiPlans } from '@/lib/hooks/ai-plans/useAiPlans';
import { useActiveAiSubscription } from '@/lib/hooks/ai-subscription/useActiveAiSubscription';
import { AiPlanCard } from './ai-plan-card';
import { AiSubscriptionPlansSkeleton } from './ai-subscription-plans.skeleton';
import { Switch } from '@/components/atoms/switch';
import { Label } from '@/components/atoms/label';
import { Badge } from '@/components/atoms/badge';
import { SubscriptionStatus } from '@/lib/types/subscription/subscription.enum';

interface AiSubscriptionPlansProps {
  /** When true, enables the child-selector modal in the subscribe button (parent flow). */
  isParent?: boolean;
}

export default function AiSubscriptionPlans({ isParent }: AiSubscriptionPlansProps) {
  const t = useTranslations('AiPricing');
  const [isAnnual, setIsAnnual] = useState(false);

  const { data: plans, isLoading: plansLoading } = useAiPlans();
  const { data: activeSub, isLoading: subLoading } = useActiveAiSubscription();

  const isLoading = plansLoading || subLoading;

  if (isLoading) return <AiSubscriptionPlansSkeleton />;

  const sorted = [...(plans ?? [])].toSorted((a, b) => {
    const aPrice = a.price?.MONTHLY?.priceUSD ?? 0;
    const bPrice = b.price?.MONTHLY?.priceUSD ?? 0;
    return aPrice - bPrice;
  });

  const popularIndex = sorted.length > 1 ? Math.floor(sorted.length / 2) : -1;

  const activeStatus = activeSub?.status;
  const isActiveSubscription = activeStatus === SubscriptionStatus.ACTIVE;
  const activePlanName =
    activeSub && typeof activeSub.aiPlanId === 'object' && activeSub.aiPlanId !== null
      ? (activeSub.aiPlanId as { name?: string }).name
      : null;

  return (
    <div className="space-y-6">
      {isActiveSubscription && activeSub ? (
        <div className="bg-primary/10 border-primary/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t('activeSubscription')}</p>
            {activePlanName ? (
              <p className="text-muted-foreground text-sm">{activePlanName}</p>
            ) : null}
          </div>
          <Badge variant="default">{t('active')}</Badge>
        </div>
      ) : null}

      {sorted.length > 0 ? (
        <div className="flex items-center justify-center gap-3">
          <Label htmlFor="ai-billing-toggle" className="text-sm font-medium">
            {t('monthly')}
          </Label>
          <Switch id="ai-billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label htmlFor="ai-billing-toggle" className="text-sm font-medium">
            {t('yearly')}
          </Label>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('noPlans')}</p>
      ) : (
        <div
          className={`grid gap-4 ${
            sorted.length === 1
              ? 'mx-auto max-w-sm'
              : sorted.length === 2
                ? 'mx-auto max-w-2xl sm:grid-cols-2'
                : sorted.length === 3
                  ? 'sm:grid-cols-2 lg:grid-cols-3'
                  : 'sm:grid-cols-2 lg:grid-cols-4'
          }`}>
          {sorted.map((plan, idx) => (
            <AiPlanCard
              key={plan._id}
              plan={plan}
              tierIndex={idx}
              isAnnual={isAnnual}
              isPopular={idx === popularIndex}
              isParent={isParent}
              activeSubscription={activeSub}
            />
          ))}
        </div>
      )}
    </div>
  );
}
