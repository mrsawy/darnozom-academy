'use client';

import { useTranslations } from 'next-intl';
import { IconLoader2 } from '@tabler/icons-react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import type { AiSubscriptionResponse } from '@/lib/actions/ai-subscription/ai-subscription.action';

interface AiSubscriptionsTableProps {
  subscriptions: AiSubscriptionResponse[];
  onCancel: (id: string) => void;
  isCancelling: boolean;
}

function getPlanName(aiPlanId: AiSubscriptionResponse['aiPlanId']): string {
  if (typeof aiPlanId === 'object' && aiPlanId && 'name' in aiPlanId) {
    return aiPlanId.name;
  }
  return String(aiPlanId);
}

function getUserName(userId: AiSubscriptionResponse['userId']): string {
  if (typeof userId === 'object' && userId && 'firstName' in userId) {
    const u = userId as { firstName: string; lastName: string; email: string };
    return `${u.firstName} ${u.lastName}`;
  }
  return String(userId);
}

function getUserEmail(userId: AiSubscriptionResponse['userId']): string {
  if (typeof userId === 'object' && userId && 'email' in userId) {
    return (userId as { email: string }).email;
  }
  return '';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

export function AiSubscriptionsTable({
  subscriptions,
  onCancel,
  isCancelling,
}: AiSubscriptionsTableProps) {
  const t = useTranslations('AdminAiSubscriptions');

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('table.user')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.plan')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.status')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.dailyUsed')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.startDate')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.endDate')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.createdAt')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={sub._id} className="hover:bg-muted/30 border-b last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">{getUserName(sub.userId)}</p>
                <p className="text-muted-foreground text-xs">{getUserEmail(sub.userId)}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{getPlanName(sub.aiPlanId)}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    sub.status === 'ACTIVE'
                      ? 'default'
                      : sub.status === 'EXPIRED'
                        ? 'destructive'
                        : 'secondary'
                  }>
                  {sub.status}
                </Badge>
              </td>
              <td className="px-4 py-3">{sub.usage.dailyMessagesUsed}</td>
              <td className="px-4 py-3">{formatDate(sub.startsAt)}</td>
              <td className="px-4 py-3">{formatDate(sub.endsAt)}</td>
              <td className="px-4 py-3">{formatDate(sub.createdAt ?? null)}</td>
              <td className="px-4 py-3">
                {sub.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isCancelling}
                    onClick={() => onCancel(sub._id)}>
                    {isCancelling ? (
                      <IconLoader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t('table.cancel')
                    )}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
