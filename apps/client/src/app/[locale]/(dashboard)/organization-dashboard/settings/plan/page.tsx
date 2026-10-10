import { getPlans, type PlanResponse } from '@/lib/actions/plan/plan.action';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { getActiveSubscription } from '@/lib/actions/subscription/subscription.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { getTranslations } from 'next-intl/server';
import PlanCard from './__components/plan-card';
import ActiveSubscriptionBanner from './__components/active-subscription-banner';

export default async function PlanPage() {
  const t = await getTranslations('OrganizationDashboard.settings.plan');
  const user = await getAuthUser();
  const organizationId = user?.organizationId ?? '';
  let plans: PlanResponse[] = [];
  let error: string | null = null;
  try {
    const plansResult = await getPlans();
    if (isNatsErrResult(plansResult)) {
      error = plansResult.err.message;
    } else {
      plans = plansResult;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load plans';
  }

  let activeSub: Awaited<ReturnType<typeof getActiveSubscription>> = null;
  try {
    activeSub = await getActiveSubscription();
  } catch {
    // non-critical — page still works without it
  }

  return (
    <div className="p-base space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {activeSub && !isNatsErrResult(activeSub) ? (
        <ActiveSubscriptionBanner subscription={activeSub} t={t} />
      ) : null}

      {error ? (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan._id}
            plan={plan}
            organizationId={organizationId}
            currentPlanId={activeSub && !isNatsErrResult(activeSub) ? activeSub.planId : undefined}
            t={t}
          />
        ))}
      </div>
      {!error && plans.length === 0 && (
        <p className="text-muted-foreground text-center">{t('noPlans')}</p>
      )}
    </div>
  );
}
