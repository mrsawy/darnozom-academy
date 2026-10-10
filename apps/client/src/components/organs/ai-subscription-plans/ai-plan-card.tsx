'use client';

import { Bot, BrainCircuit, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { type AiPlanResponse } from '@/lib/actions/ai-plan/ai-plan.action';
import { type AiSubscriptionResponse } from '@/lib/actions/ai-subscription/ai-subscription.action';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { cn } from '@/lib/utils';
import { AiSubscribeButton } from './ai-subscribe-button';
import { ROUTE_SIGNUP } from '@/lib/data/constants/routes.constants';

interface AiPlanCardProps {
  plan: AiPlanResponse;
  tierIndex: number;
  isAnnual: boolean;
  isPopular: boolean;
  isParent?: boolean;
  activeSubscription?: AiSubscriptionResponse | null;
}

function formatPrice(amount: number, currency: string) {
  if (currency === 'USD') return `$${amount}`;
  return `${amount} ${currency}`;
}

function hasPrice(cycle: { originalPrice?: number; priceUSD?: number } | undefined) {
  return cycle && ((cycle.originalPrice ?? 0) > 0 || (cycle.priceUSD ?? 0) > 0);
}

type AiPlanVisualVariant = 'free' | 'basic' | 'pro';

function getVisualVariant(tierIndex: number): AiPlanVisualVariant {
  if (tierIndex === 0) return 'free';
  if (tierIndex === 1) return 'basic';
  return 'pro';
}

function variantMeta(variant: AiPlanVisualVariant) {
  switch (variant) {
    case 'free': {
      return { Icon: Bot, iconWrap: 'bg-muted text-muted-foreground' };
    }
    case 'basic': {
      return { Icon: Sparkles, iconWrap: 'bg-primary/20 text-primary' };
    }
    default: {
      return { Icon: BrainCircuit, iconWrap: 'bg-secondary/20 text-secondary' };
    }
  }
}

function resolveActiveAiPlanId(sub: AiSubscriptionResponse | null | undefined): string | null {
  if (!sub) return null;
  const p = sub.aiPlanId;
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object' && '_id' in p) return (p as { _id: string })._id;
  return null;
}

export function AiPlanCard({
  plan,
  tierIndex,
  isAnnual,
  isPopular,
  isParent,
  activeSubscription,
}: AiPlanCardProps) {
  const t = useTranslations('AiPricing');
  const monthly = plan.price?.MONTHLY;
  const yearly = plan.price?.YEARLY;
  const hasMonthly = hasPrice(monthly);
  const hasYearly = hasPrice(yearly);
  const isFree = !hasMonthly && !hasYearly;

  const variant = getVisualVariant(tierIndex);
  const { Icon, iconWrap } = variantMeta(variant);

  const activeCycle = isAnnual ? yearly : monthly;
  const hasActivePrice = isAnnual ? hasYearly : hasMonthly;
  const currency = activeCycle?.originalCurrency ?? 'USD';
  const unitAmount = activeCycle ? (activeCycle.originalPrice ?? activeCycle.priceUSD ?? 0) : 0;

  const activePlanId = resolveActiveAiPlanId(activeSubscription);
  const isCurrentPlan = activePlanId === plan._id;

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

  const featureRows: { key: string; label: string }[] = [];
  const { messagesPerDay, aiAssistant } = plan.features;
  if (typeof messagesPerDay === 'number') {
    featureRows.push({
      key: 'messages',
      label:
        messagesPerDay < 0
          ? t('unlimitedMessages')
          : t('messagesPerDay', { count: messagesPerDay }),
    });
  }
  if (aiAssistant) {
    featureRows.push({ key: 'assistant', label: t('aiAssistantIncluded') });
  }

  const billingCycle = isAnnual ? BillingCycle.YEARLY : BillingCycle.MONTHLY;
  const lsVariantId = isAnnual
    ? (plan as AiPlanResponse & { lemonSqueezyVariantIds?: { MONTHLY?: string; YEARLY?: string } })
        .lemonSqueezyVariantIds?.YEARLY
    : (plan as AiPlanResponse & { lemonSqueezyVariantIds?: { MONTHLY?: string; YEARLY?: string } })
        .lemonSqueezyVariantIds?.MONTHLY;

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

      {isCurrentPlan ? (
        <div className="absolute end-3 top-3">
          <Badge variant="secondary">{t('currentPlan')}</Badge>
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
        {plan.description ? (
          <CardDescription className="mt-2 text-base">{plan.description}</CardDescription>
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
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 pt-0">
        {isCurrentPlan ? (
          <Button variant="secondary" className="w-full" size="lg" disabled>
            {t('currentPlan')}
          </Button>
        ) : isFree ? (
          <Button
            asChild
            className="w-full"
            size="lg"
            variant={isPopular ? 'default' : 'secondary'}>
            <Link href={ROUTE_SIGNUP}>{t('getStarted')}</Link>
          </Button>
        ) : (
          <AiSubscribeButton
            aiPlanId={plan._id}
            billingCycle={billingCycle}
            lemonSqueezyVariantId={lsVariantId}
            className={cn(
              'w-full',
              isPopular && 'bg-primary shadow-primary/25 hover:bg-primary/90 shadow-lg'
            )}
            variant={isPopular ? 'default' : 'outline'}
            size="lg"
            isParent={isParent}>
            {isAnnual ? t('subscribeYearly') : t('subscribeMonthly')}
          </AiSubscribeButton>
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
