import { useQuery } from '@/lib/utils';
import { getOrganizationMemberDashboardReports } from '@/lib/actions/reports/reports.action';
import type { ReportsParams } from '@/lib/types/reports/reports-params.types';

export const organizationMemberReportsKeys = {
  all: ['organization-member-reports'] as const,
  dashboard: (params?: ReportsParams) =>
    [...organizationMemberReportsKeys.all, 'dashboard', params ?? {}] as const,
};

export function useOrganizationMemberDashboardReports(options?: {
  params?: ReportsParams;
  enabled?: boolean;
}) {
  const params = options?.params;
  return useQuery({
    queryKey: organizationMemberReportsKeys.dashboard(params),
    queryFn: () => getOrganizationMemberDashboardReports(params),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
