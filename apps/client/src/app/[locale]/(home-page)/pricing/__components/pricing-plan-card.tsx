'use client';

import { Building2, Check, Crown, Rocket, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Link } from '@/i18n/navigation';
import { ROUTE_SIGNUP } from '@/lib/data/constants/routes.constants';
import { useTranslations } from 'next-intl';
import { type PlanFeatures, type PlanResponse } from '@/lib/actions/plan/plan.action';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { cn } from '@/lib/utils';
import PricingSubscribeButton from './pricing-subscribe-button';

export type PlanVisualVariant = 'starter' | 'pro' | 'enterprise';

interface PricingPlanCardProps {
  plan: PlanResponse;
  /** Position in the sorted plan list; maps to translated default taglines (tiers 0–3). */
  tierIndex: number;
  isAnnual: boolean;
  isPopular: boolean;
  visualVariant: PlanVisualVariant;
}

function formatPrice(amount: number, currency: string) {
  if (currency === 'USD') return `$${amount}`;
  return `${amount} ${currency}`;
}

function hasPrice(cycle: { originalPrice?: number; priceUSD?: number } | undefined) {
  return cycle && ((cycle.originalPrice ?? 0) > 0 || (cycle.priceUSD ?? 0) > 0);
}

function variantMeta(variant: PlanVisualVariant, tierIndex: number) {
  switch (variant) {
    case 'starter': {
      return { Icon: Zap, iconWrap: 'bg-primary/20 text-primary' };
    }
    case 'enterprise': {
      return { Icon: Building2, iconWrap: 'bg-accent/20 text-accent' };
    }
    default: {
      // Pro and additional middle tiers: alternate so Basic (Zap) vs Pro (Rocket/Crown) stay distinct; 4+ plans don’t repeat one icon.
      const Icon = (tierIndex - 1) % 2 === 0 ? Rocket : Crown;
      return { Icon, iconWrap: 'bg-secondary/20 text-secondary' };
    }
  }
}

function resolvePlanCardDescription(
  t: ReturnType<typeof useTranslations<'HomeLegal.pricing.plans'>>,
  tierIndex: number,
  apiDescription: string | undefined
): string | null {
  const tierKeyIndex = Math.min(Math.max(0, tierIndex), 3);
  const tierKey = `descriptionTiers.${tierKeyIndex}` as const;
  if (t.has(tierKey)) {
    return t(tierKey);
  }
  const raw = apiDescription?.trim();
  if (!raw) return null;
  return raw;
}

export default function PricingPlanCard({
  plan,
  tierIndex,
  isAnnual,
  isPopular,
  visualVariant,
}: PricingPlanCardProps) {
  const t = useTranslations('HomeLegal.pricing.plans');
  const monthly = plan.price?.MONTHLY;
  const yearly = plan.price?.YEARLY;
  const hasMonthly = hasPrice(monthly);
  const hasYearly = hasPrice(yearly);
  const isFree = !hasMonthly && !hasYearly;
  const features: PlanFeatures = plan.features;

  const { Icon, iconWrap } = variantMeta(visualVariant, tierIndex);

  const descriptionText = resolvePlanCardDescription(t, tierIndex, plan.description);

  const activeCycle = isAnnual ? yearly : monthly;
  const hasActivePrice = isAnnual ? hasYearly : hasMonthly;
  const currency = activeCycle?.originalCurrency ?? 'USD';
  const unitAmount = activeCycle ? (activeCycle.originalPrice ?? activeCycle.priceUSD ?? 0) : 0;

  let savingsLine: string | null = null;
  if (isAnnual && hasMonthly && hasYearly && monthly && yearly) {
    const mAmt = monthly.originalPrice ?? monthly.priceUSD ?? 0;
    const yAmt = yearly.originalPrice ?? yearly.priceUSD ?? 0;
    if (mAmt > 0 && yAmt > 0) {
      const monthlyTotal = mAmt * 12;
      const saveAmt = monthlyTotal - yAmt;
      const pct = Math.round((saveAmt / monthlyTotal) * 100);
      if (saveAmt > 0 && pct > 0) {
        savingsLine = t('savingsYearly', { amount: formatPrice(saveAmt, currency), percent: pct });
      }
    }
  }

  const usersLabel =
    typeof features.usersPerSubscription === 'number'
      ? features.usersPerSubscription >= 9999
        ? t('unlimitedUsers')
        : t('usersCap', { count: features.usersPerSubscription })
      : null;

  const featureRows: { key: string; label: string }[] = [];
  if (typeof features.coursesPerSubscription === 'number')
    featureRows.push({
      key: 'courses',
      label: t('maxCourses', { count: features.coursesPerSubscription }),
    });
  if (typeof features.maxStorageGB === 'number')
    featureRows.push({ key: 'storage', label: t('storageGb', { count: features.maxStorageGB }) });
  if (features.courseAnalytics || features.contentAnalytics || features.moduleAnalytics)
    featureRows.push({ key: 'analytics', label: t('analyticsIncluded') });
  if (features.trackingStudentProgress)
    featureRows.push({ key: 'progress', label: t('studentProgress') });
  if (features.prioritySupport) featureRows.push({ key: 'support', label: t('prioritySupport') });

  return (
    <Card
      className={cn(
        'bg-card/85 relative flex h-full flex-col overflow-hidden rounded-2xl border-2 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg',
        isPopular && 'border-primary/50 ring-primary/20 scale-[1.02] ring-2 md:scale-105'
      )}>
      {isPopular ? (
        <div className="absolute -top-px left-1/2 z-10 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground gap-1 rounded-b-md px-3 py-1 shadow-sm">
            <Sparkles className="h-3 w-3" aria-hidden />
            {t('mostPopular')}
          </Badge>
        </div>
      ) : null}

      <CardHeader className={cn('pt-10 pb-4 text-center', isPopular && 'pt-12')}>
        <div
          className={cn(
            'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl',
            iconWrap
          )}>
          <Icon className="h-8 w-8" aria-hidden />
        </div>
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        {descriptionText ? (
          <CardDescription className="mt-2 text-base">{descriptionText}</CardDescription>
        ) : null}

        <div className="mt-6 space-y-2">
          {isFree ? (
            <p className="text-4xl font-bold">{t('free')}</p>
          ) : hasActivePrice ? (
            <>
              <div className="flex flex-wrap items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">{formatPrice(unitAmount, currency)}</span>
                <span className="text-muted-foreground">
                  {isAnnual ? t('perYear') : t('perMonth')}
                </span>
              </div>
              {savingsLine ? (
                <p className="text-primary text-sm font-medium">{savingsLine}</p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground font-medium">{t('free')}</p>
          )}
          {usersLabel ? <p className="text-muted-foreground text-sm">{usersLabel}</p> : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 pt-0">
        {isFree ? (
          <Button
            asChild
            className="w-full"
            size="lg"
            variant={isPopular ? 'default' : 'secondary'}>
            <Link href={ROUTE_SIGNUP}>{t('getStarted')}</Link>
          </Button>
        ) : (
          <PricingSubscribeButton
            planId={plan._id}
            billingCycle={isAnnual ? BillingCycle.YEARLY : BillingCycle.MONTHLY}
            lemonSqueezyVariantId={
              isAnnual ? plan.lemonSqueezyVariantIds?.YEARLY : plan.lemonSqueezyVariantIds?.MONTHLY
            }
            className={cn(
              'w-full',
              isPopular && 'bg-primary shadow-primary/25 hover:bg-primary/90 shadow-lg'
            )}
            variant={isPopular ? 'default' : 'outline'}
            size="lg">
            {isAnnual ? t('subscribeYearly') : t('subscribeMonthly')}
          </PricingSubscribeButton>
        )}

        <ul className="text-muted-foreground flex flex-1 flex-col gap-3 text-sm">
          {featureRows.map((row) => (
            <li key={row.key} className="flex items-start gap-3 text-start">
              <Check className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
