import { getActiveSubscription } from '@/lib/actions/subscription/subscription.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default async function UsagePage() {
  const t = await getTranslations('OrganizationDashboard.settings.usage');
  let subscription: Awaited<ReturnType<typeof getActiveSubscription>> = null;
  let error: string | null = null;
  try {
    subscription = await getActiveSubscription();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load subscription';
  }

  const activeSubscription = subscription && !isNatsErrResult(subscription) ? subscription : null;

  return (
    <div className="p-base space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      {error ? (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}
      {!error && !activeSubscription ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">{t('noSubscription')}</p>
          </CardContent>
        </Card>
      ) : null}
      {!error && activeSubscription ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('plan')}</CardTitle>
              <CardDescription>
                {activeSubscription.plan?.name ?? activeSubscription.planId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('status')}</span>
                <Badge variant={activeSubscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {activeSubscription.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('billingCycle')}</span>
                <span>{activeSubscription.billingCycle}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('startsAt')}</span>
                <span>{formatDate(activeSubscription.startsAt)}</span>
              </div>
              {activeSubscription.nextBillingAt ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('nextBillingAt')}</span>
                  <span>{formatDate(activeSubscription.nextBillingAt)}</span>
                </div>
              ) : null}
              {activeSubscription.endsAt ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('endsAt')}</span>
                  <span>{formatDate(activeSubscription.endsAt)}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
          {activeSubscription.billing ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('billing')}</CardTitle>
                <CardDescription>
                  {activeSubscription.billing.firstName} {activeSubscription.billing.lastName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('email')}</span>
                  <p>{activeSubscription.billing.email}</p>
                </div>
                {activeSubscription.billing.phoneNumber ? (
                  <div>
                    <span className="text-muted-foreground">{t('phone')}</span>
                    <p>{activeSubscription.billing.phoneNumber}</p>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('amount')}</span>
                  <span>
                    {activeSubscription.billing.currency} {activeSubscription.billing.amount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('cycle')}</span>
                  <span>{activeSubscription.billing.billingCycle}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
