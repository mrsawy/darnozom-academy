'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStats } from '@/lib/hooks/admin-review/use-admin-review.hook';
import { StatsCards } from './__components/StatsCards';
import { Skeleton } from '@/components/atoms/skeleton';
import { Button } from '@/components/atoms/button';

export default function MainAdminDashboardPage() {
  const t = useTranslations('AdminDashboard');
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('overviewTitle')}</h1>
        <p className="text-muted-foreground">{t('overviewDescription')}</p>
      </div>

      {isLoading ? <StatsCardsSkeleton /> : null}
      {isError ? (
        <div className="space-y-2 py-8 text-center">
          <p className="text-destructive">{t('failedToLoadStats')}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}
      {stats ? <StatsCards stats={stats} /> : null}
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
