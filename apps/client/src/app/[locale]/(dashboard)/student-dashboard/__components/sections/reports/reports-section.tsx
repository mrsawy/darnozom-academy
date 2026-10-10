'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { StudentDashboardReports } from '@/components/molecules/reports/student-dashboard-reports';
import { useStudentDashboardReports } from '@/lib/hooks/reports/use-student-dashboard-reports';
import {
  resolveReportsParams,
  type ReportsFilters,
} from '@/lib/types/reports/reports-params.types';

const defaultFilters: ReportsFilters = { preset: '30d', accessType: 'all' };

export function ReportsSection() {
  const t = useTranslations('StudentDashboard.reports');
  const [filters, setFilters] = useState<ReportsFilters>(defaultFilters);
  const params = useMemo(() => resolveReportsParams(filters), [filters]);

  const { data, isLoading, isError, error, refetch } = useStudentDashboardReports({ params });

  return (
    <section className="flex flex-col gap-4" aria-labelledby="student-reports-heading">
      <div className="px-0 lg:px-0">
        <h2 id="student-reports-heading" className="text-lg font-semibold tracking-tight">
          {t('sectionTitle')}
        </h2>
      </div>
      <StudentDashboardReports
        data={data}
        isLoading={isLoading}
        isError={isError}
        error={error instanceof Error ? error : null}
        onRetry={() => void refetch()}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </section>
  );
}
