import type { ActiveSubscriptionResponse } from '@/lib/actions/subscription/subscription.action';
import { SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';

export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const getStatusBadgeVariant = (
  status: SubscriptionStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case SubscriptionStatus.ACTIVE: {
      return 'default';
    }
    case SubscriptionStatus.EXPIRED: {
      return 'secondary';
    }
    case SubscriptionStatus.CANCELLED:
    case SubscriptionStatus.SUSPENDED: {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
};

export function subscriptionAllowsStudentProgress(
  sub: ActiveSubscriptionResponse | null | undefined
): boolean {
  return sub?.plan?.features?.trackingStudentProgress === true;
}
