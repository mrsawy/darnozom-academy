import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import AiSubscriptionPlans from '@/components/organs/ai-subscription-plans/ai-subscription-plans';
import { AiSubscriptionPlansSkeleton } from '@/components/organs/ai-subscription-plans/ai-subscription-plans.skeleton';

export default async function ParentAiSubscriptionPage() {
  const t = await getTranslations('AiPricing');
  return (
    <div className="p-base space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Suspense fallback={<AiSubscriptionPlansSkeleton />}>
        <AiSubscriptionPlans isParent />
      </Suspense>
    </div>
  );
}
