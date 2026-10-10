import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { IconUsers, IconBook, IconDatabase, IconChartBar, IconHeadset } from '@tabler/icons-react';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { PaymentProvider } from '@/lib/types/payment/payment.interface';
import { PlanResponse } from '@/lib/actions/plan/plan.action';
import { SubscribePlanButton } from './subscribe-plan-button';

function formatPrice(amount: number, currency: string) {
  if (currency === 'USD') return `$${amount}`;
  return `${amount} ${currency}`;
}

function hasPrice(
  cycle: { originalPrice?: number; priceUSD?: number; originalCurrency?: string } | undefined
) {
  return cycle && ((cycle.originalPrice ?? 0) > 0 || (cycle.priceUSD ?? 0) > 0);
}

interface PlanCardProps {
  plan: PlanResponse;
  organizationId: string;
  currentPlanId?: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export default function PlanCard({ plan, organizationId, currentPlanId, t }: PlanCardProps) {
  const isCurrentPlan = currentPlanId === plan._id;
  const price = plan.price ?? {};
  const monthly = price.MONTHLY;
  const yearly = price.YEARLY;
  const oneTime = price.ONE_TIME;
  const features = plan.features ?? {};
  const f = features as {
    maxUsers?: number;
    maxCourses?: number;
    maxStorageGB?: number;
    courseAnalytics?: boolean;
    contentAnalytics?: boolean;
    moduleAnalytics?: boolean;
    trackingStudentProgress?: boolean;
    prioritySupport?: boolean;
  };
  const hasMonthly = hasPrice(monthly);
  const hasYearly = hasPrice(yearly);
  const hasOneTime = hasPrice(oneTime);
  const isFree = !hasMonthly && !hasYearly && !hasOneTime;

  return (
    <Card
      className={`flex flex-col border-2 transition-shadow hover:shadow-md ${isCurrentPlan ? 'border-primary ring-primary/20 ring-2' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          {isCurrentPlan ? <Badge className="bg-primary">{t('currentPlan')}</Badge> : null}
          {plan.tier ? <Badge variant="secondary">{plan.tier}</Badge> : null}
        </div>
        {plan.description ? (
          <CardDescription className="mt-1">{plan.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="bg-muted/50 space-y-3 rounded-lg p-4">
          {hasMonthly && monthly ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-sm">{t('monthly')}</span>
              <span className="font-semibold">
                {formatPrice(monthly.originalPrice ?? 0, monthly.originalCurrency ?? 'USD')}
                <span className="text-muted-foreground ms-1 text-sm font-normal">
                  {t('perMonth')}
                </span>
              </span>
            </div>
          ) : null}
          {hasYearly && yearly ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-sm">{t('yearly')}</span>
              <span className="font-semibold">
                {formatPrice(yearly.originalPrice ?? 0, yearly.originalCurrency ?? 'USD')}
                <span className="text-muted-foreground ms-1 text-sm font-normal">
                  {t('perYear')}
                </span>
              </span>
            </div>
          ) : null}
          {/* {hasOneTime && oneTime && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-sm">{t('oneTime')}</span>
              <span className="font-semibold">
                {formatPrice(oneTime.originalPrice ?? 0, oneTime.originalCurrency ?? 'USD')}
              </span>
            </div>
          )} */}
          {isFree ? <p className="text-muted-foreground font-medium">{t('free')}</p> : null}
        </div>
        <ul className="text-muted-foreground flex flex-1 flex-col gap-2 text-sm">
          {typeof f.maxUsers === 'number' ? (
            <li className="flex items-center gap-2">
              <IconUsers className="size-4 shrink-0" />
              {t('maxUsers', { count: f.maxUsers })}
            </li>
          ) : null}
          {typeof f.maxCourses === 'number' ? (
            <li className="flex items-center gap-2">
              <IconBook className="size-4 shrink-0" />
              {t('maxCourses', { count: f.maxCourses })}
            </li>
          ) : null}
          {typeof f.maxStorageGB === 'number' ? (
            <li className="flex items-center gap-2">
              <IconDatabase className="size-4 shrink-0" />
              {t('maxStorage', { count: f.maxStorageGB })}
            </li>
          ) : null}
          {(f.courseAnalytics ?? f.contentAnalytics ?? f.moduleAnalytics) ? (
            <li className="flex items-center gap-2">
              <IconChartBar className="size-4 shrink-0" />
              {t('analytics')}
            </li>
          ) : null}
          {f.trackingStudentProgress ? (
            <li className="flex items-center gap-2">
              <IconChartBar className="size-4 shrink-0" />
              {t('progressTracking')}
            </li>
          ) : null}
          {f.prioritySupport ? (
            <li className="flex items-center gap-2">
              <IconHeadset className="size-4 shrink-0" />
              {t('prioritySupport')}
            </li>
          ) : null}
        </ul>
        {!isFree && organizationId && (hasMonthly || hasYearly) ? (
          <div className="mt-auto flex flex-col gap-2 pt-2">
            {hasMonthly ? (
              <SubscribePlanButton
                planId={plan._id}
                organizationId={organizationId}
                billingCycle={BillingCycle.MONTHLY}
                provider={PaymentProvider.LEMON_SQUEEZY}
                lemonSqueezyVariantId={plan.lemonSqueezyVariantIds?.MONTHLY}
                className="w-full">
                {t('subscribeMonthly')}
              </SubscribePlanButton>
            ) : null}
            {hasYearly ? (
              <SubscribePlanButton
                planId={plan._id}
                organizationId={organizationId}
                billingCycle={BillingCycle.YEARLY}
                provider={PaymentProvider.LEMON_SQUEEZY}
                lemonSqueezyVariantId={plan.lemonSqueezyVariantIds?.YEARLY}
                className="w-full"
                variant="outline">
                {t('subscribeYearly')}
              </SubscribePlanButton>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
