import { useQuery } from '@/lib/utils';
import { getInstructorDashboardReports } from '@/lib/actions/reports/reports.action';
import type { ReportsParams } from '@/lib/types/reports/reports-params.types';

export const instructorReportsKeys = {
  all: ['instructor-reports'] as const,
  dashboard: (params?: ReportsParams) =>
    [...instructorReportsKeys.all, 'dashboard', params ?? {}] as const,
};

export function useInstructorDashboardReports(options?: {
  params?: ReportsParams;
  enabled?: boolean;
}) {
  const params = options?.params;
  return useQuery({
    queryKey: instructorReportsKeys.dashboard(params),
    queryFn: () => getInstructorDashboardReports(params),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
