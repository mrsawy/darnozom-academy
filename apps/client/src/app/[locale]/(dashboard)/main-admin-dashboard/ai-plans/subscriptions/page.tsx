'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { useAdminAiPlans } from '@/lib/hooks/admin-ai-plans/use-admin-ai-plans.hook';
import {
  useAdminAiSubscriptions,
  useCancelAiSubscription,
} from '@/lib/hooks/admin-ai-subscriptions/use-admin-ai-subscriptions.hook';
import { AiSubscriptionsTable } from './__components/ai-subscriptions-table';
import { AiSubscriptionsFilters } from './__components/ai-subscriptions-filters';
import type { AiSubscriptionFilters } from '@/lib/actions/ai-subscription/ai-subscription.action';

const LIMIT = 20;

export default function AdminAiSubscriptionsPage() {
  const t = useTranslations('AdminAiSubscriptions');

  const [filters, setFilters] = useState<AiSubscriptionFilters>({});
  const [page, setPage] = useState(1);

  const { data: plans } = useAdminAiPlans();
  const { data: result, isLoading } = useAdminAiSubscriptions(filters, page, LIMIT);
  const cancelSubscription = useCancelAiSubscription();

  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  const handleFiltersChange = (next: AiSubscriptionFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <AiSubscriptionsFilters
        plans={plans ?? []}
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleReset}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : result && result.docs.length > 0 ? (
        <>
          <AiSubscriptionsTable
            subscriptions={result.docs}
            onCancel={(id) => cancelSubscription.mutate(id)}
            isCancelling={cancelSubscription.isPending}
          />

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {t('pagination.showing', {
                from: (page - 1) * LIMIT + 1,
                to: Math.min(page * LIMIT, result.totalDocs),
                total: result.totalDocs,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!result.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}>
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                {page} / {result.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!result.hasNextPage}
                onClick={() => setPage((p) => p + 1)}>
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground py-12 text-center">{t('noSubscriptions')}</p>
      )}
    </div>
  );
}
