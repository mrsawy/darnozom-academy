import { Badge } from '@/components/atoms/badge';
import type { ActiveSubscriptionResponse } from '@/lib/actions/subscription/subscription.action';

interface ActiveSubscriptionBannerProps {
  subscription: ActiveSubscriptionResponse;
  t: (key: string) => string;
}

export default function ActiveSubscriptionBanner({
  subscription,
  t,
}: ActiveSubscriptionBannerProps) {
  const isExpired = subscription.status === 'EXPIRED';
  const isCancelled = subscription.status === 'CANCELLED';
  const isActive = subscription.status === 'ACTIVE';

  const endsAt = subscription.endsAt ? new Date(subscription.endsAt) : null;
  const isExpiredByDate = endsAt && endsAt < new Date();
  const expired = isExpired || isExpiredByDate;

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        expired
          ? 'border-red-300 bg-red-50 text-red-800'
          : isCancelled
            ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
            : 'border-green-300 bg-green-50 text-green-800'
      }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {t('currentPlan')}: {subscription.plan?.name ?? subscription.planId}
          </span>
          <Badge
            className={
              expired
                ? 'bg-red-500'
                : isCancelled
                  ? 'bg-yellow-500'
                  : isActive
                    ? 'bg-green-500'
                    : 'bg-gray-500'
            }>
            {subscription.status}
          </Badge>
          {subscription.billingCycle ? (
            <Badge variant="outline">{subscription.billingCycle}</Badge>
          ) : null}
        </div>
        <div className="text-sm">
          {endsAt ? (
            <span>
              {expired ? t('expiredOn') : t('renewsOn')}: {endsAt.toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </div>
      {expired ? <p className="mt-1 text-sm">{t('expiredMessage')}</p> : null}
    </div>
  );
}
