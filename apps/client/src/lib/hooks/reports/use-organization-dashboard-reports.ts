import { useQuery } from '@/lib/utils';
import { getOrganizationDashboardReports } from '@/lib/actions/reports/reports.action';
import type { ReportsParams } from '@/lib/types/reports/reports-params.types';

export const organizationReportsKeys = {
  all: ['organization-reports'] as const,
  dashboard: (params?: ReportsParams) =>
    [...organizationReportsKeys.all, 'dashboard', params ?? {}] as const,
};

export function useOrganizationDashboardReports(options?: {
  params?: ReportsParams;
  enabled?: boolean;
}) {
  const params = options?.params;
  return useQuery({
    queryKey: organizationReportsKeys.dashboard(params),
    queryFn: () => getOrganizationDashboardReports(params),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
