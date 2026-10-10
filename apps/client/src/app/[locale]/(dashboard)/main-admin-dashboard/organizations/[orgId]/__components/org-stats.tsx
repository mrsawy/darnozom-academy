'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import type { IAdminOrganizationDetails } from '@/lib/types/admin-review/admin-review.interface';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

interface OrgStatsProps {
  org: IAdminOrganizationDetails;
}

export function OrgStats({ org }: OrgStatsProps) {
  const t = useTranslations('AdminDashboard');
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t('table.courses')} value={org.coursesCount} />
      <StatCard label={t('table.users')} value={org.usersCount} />
      <StatCard label={t('table.enrollments')} value={org.stats?.totalEnrollments ?? 0} />
      <StatCard label={t('table.avgRating')} value={org.stats?.averageRating?.toFixed(1) ?? '—'} />
    </div>
  );
}
