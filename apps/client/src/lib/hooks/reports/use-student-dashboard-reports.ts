import { useQuery } from '@/lib/utils';
import { getStudentDashboardReports } from '@/lib/actions/reports/reports.action';
import type { ReportsParams } from '@/lib/types/reports/reports-params.types';

export const studentReportsKeys = {
  all: ['student-reports'] as const,
  dashboard: (params?: ReportsParams) =>
    [...studentReportsKeys.all, 'dashboard', params ?? {}] as const,
};

export function useStudentDashboardReports(options?: {
  params?: ReportsParams;
  enabled?: boolean;
}) {
  const params = options?.params;
  return useQuery({
    queryKey: studentReportsKeys.dashboard(params),
    queryFn: () => getStudentDashboardReports(params),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
