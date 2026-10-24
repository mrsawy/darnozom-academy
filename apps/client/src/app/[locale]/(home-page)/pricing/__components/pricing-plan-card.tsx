'use client';

import { Check } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ROUTE_SIGNUP } from '@/lib/data/constants/routes.constants';
import { useTranslations } from 'next-intl';
import { type PlanFeatures, type PlanResponse } from '@/lib/actions/plan/plan.action';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { cn } from '@/lib/utils';
import PricingSubscribeButton from './pricing-subscribe-button';

interface PricingPlanCardProps {
  plan: PlanResponse;
  /** Position in the sorted plan list; maps to translated default taglines (tiers 0–3). */
  tierIndex: number;
  isAnnual: boolean;
  isPopular: boolean;
}

function formatPrice(amount: number, currency: string) {
  if (currency === 'USD') return `$${amount}`;
  return `${amount} ${currency}`;
}

function hasPrice(cycle: { originalPrice?: number; priceUSD?: number } | undefined) {
  return cycle && ((cycle.originalPrice ?? 0) > 0 || (cycle.priceUSD ?? 0) > 0);
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
}: PricingPlanCardProps) {
  const t = useTranslations('HomeLegal.pricing.plans');
  const monthly = plan.price?.MONTHLY;
  const yearly = plan.price?.YEARLY;
  const hasMonthly = hasPrice(monthly);
  const hasYearly = hasPrice(yearly);
  const isFree = !hasMonthly && !hasYearly;
  const features: PlanFeatures = plan.features;

  const descriptionText = resolvePlanCardDescription(t, tierIndex, plan.description);

  const activeCycle = isAnnual ? yearly : monthly;
  const hasActivePrice = isAnnual ? hasYearly : hasMonthly;
  const currency = activeCycle?.originalCurrency ?? 'USD';
  const unitAmount = activeCycle ? (activeCycle.originalPrice ?? activeCycle.priceUSD ?? 0) : 0;

  let savingsLine: string | null = null;
  if (isAnnual && hasMonthly && hasYearly && monthly && yearly) {
    const monthlyAmount = monthly.originalPrice ?? monthly.priceUSD ?? 0;
    const yearlyAmount = yearly.originalPrice ?? yearly.priceUSD ?? 0;
    if (monthlyAmount > 0 && yearlyAmount > 0) {
      const monthlyTotal = monthlyAmount * 12;
      const saveAmount = monthlyTotal - yearlyAmount;
      const percent = Math.round((saveAmount / monthlyTotal) * 100);
      if (saveAmount > 0 && percent > 0) {
        savingsLine = t('savingsYearly', {
          amount: formatPrice(saveAmount, currency),
          percent,
        });
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
  if (usersLabel) featureRows.push({ key: 'users', label: usersLabel });
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
    <div
      className={cn(
        'flex h-full flex-col gap-3.5 rounded-[22px] border p-6.5',
        isPopular
          ? 'bg-dz-cocoa border-dz-cocoa-line text-dz-cocoa-ink'
          : 'bg-dz-paper-raised border-dz-line text-dz-ink'
      )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold">{plan.name}</span>
        {isPopular ? (
          <span className="bg-dz-tan text-dz-ink rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap">
            {t('mostPopular')}
          </span>
        ) : null}
      </div>

      {descriptionText ? <p className="m-0 text-sm opacity-85">{descriptionText}</p> : null}

      <div className="flex flex-wrap items-baseline gap-1.5">
        {isFree || !hasActivePrice ? (
          <span className="font-display text-[2.5rem] leading-[1.2] font-bold">{t('free')}</span>
        ) : (
          <>
            <span className="font-display text-[2.5rem] leading-[1.2] font-bold">
              {formatPrice(unitAmount, currency)}
            </span>
            <span className="text-[13px] opacity-80">
              {isAnnual ? t('perYear') : t('perMonth')}
            </span>
          </>
        )}
      </div>

      {savingsLine ? (
        <p
          className={cn(
            'm-0 text-sm font-medium',
            isPopular ? 'text-dz-tan' : 'text-dz-terracotta'
          )}>
          {savingsLine}
        </p>
      ) : null}

      <ul
        className={cn(
          'm-0 flex flex-1 list-none flex-col gap-2 border-t p-0 pt-3.5 text-sm',
          isPopular ? 'border-dz-cocoa-line' : 'border-dz-line'
        )}>
        {featureRows.map((row) => (
          <li key={row.key} className="flex items-start gap-2">
            <Check
              className={cn(
                'mt-0.5 size-4 shrink-0',
                isPopular ? 'text-dz-tan' : 'text-dz-terracotta'
              )}
              aria-hidden
            />
            <span>{row.label}</span>
          </li>
        ))}
      </ul>

      {isFree ? (
        <Link
          href={ROUTE_SIGNUP}
          className={cn(
            'rounded-full px-4 py-3 text-center text-[15px] font-semibold transition-opacity hover:opacity-90',
            isPopular ? 'bg-dz-tan text-dz-ink' : 'bg-dz-ink text-dz-paper-raised'
          )}>
          {t('getStarted')}
        </Link>
      ) : (
        <PricingSubscribeButton
          planId={plan._id}
          billingCycle={isAnnual ? BillingCycle.YEARLY : BillingCycle.MONTHLY}
          lemonSqueezyVariantId={
            isAnnual ? plan.lemonSqueezyVariantIds?.YEARLY : plan.lemonSqueezyVariantIds?.MONTHLY
          }
          className={cn(
            'h-auto w-full rounded-full px-4 py-3 text-[15px] font-semibold transition-opacity hover:opacity-90',
            isPopular
              ? 'bg-dz-tan text-dz-ink hover:bg-dz-tan'
              : 'bg-dz-ink text-dz-paper-raised hover:bg-dz-ink'
          )}
          size="lg">
          {isAnnual ? t('subscribeYearly') : t('subscribeMonthly')}
        </PricingSubscribeButton>
      )}
    </div>
  );
}
