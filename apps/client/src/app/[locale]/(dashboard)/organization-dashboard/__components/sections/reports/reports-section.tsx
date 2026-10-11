'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Roles } from '@darnozom/shared-types';
import { OrganizationDashboardReports } from '@/components/molecules/reports/organization-dashboard-reports';
import {
  ORG_DASHBOARD_REPORTS_NAMESPACE,
  ORG_INSTRUCTOR_REPORTS_NAMESPACE,
} from '@/components/molecules/reports/organization-dashboard-reports/organization-dashboard-reports.types';
import {
  OrganizationMemberDashboardReports,
  ORG_MEMBER_DASHBOARD_REPORTS_NAMESPACE,
} from '@/components/molecules/reports/organization-member-dashboard-reports';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { useInstructorDashboardReports } from '@/lib/hooks/reports/use-instructor-dashboard-reports';
import { useOrganizationDashboardReports } from '@/lib/hooks/reports/use-organization-dashboard-reports';
import { useOrganizationMemberDashboardReports } from '@/lib/hooks/reports/use-organization-member-dashboard-reports';
import {
  resolveReportsParams,
  type ReportsFilters,
} from '@/lib/types/reports/reports-params.types';

const defaultFilters: ReportsFilters = { preset: '30d', accessType: 'all' };

export function ReportsSection() {
  const { data: user, isPending: isUserPending } = useAuthUser();
  const isAdmin =
    user?.roleName != null && ([Roles.ADMIN, Roles.SUPER_ADMIN] as Roles[]).includes(user.roleName);
  const isInstructor = user?.roleName === Roles.INSTRUCTOR;
  const showOrgReports = isAdmin;
  const showInstructorReports = isInstructor && !isAdmin;
  const showMemberReports = !showOrgReports && !showInstructorReports;

  const [filters, setFilters] = useState<ReportsFilters>(defaultFilters);
  const params = useMemo(() => resolveReportsParams(filters), [filters]);

  const orgT = useTranslations(ORG_DASHBOARD_REPORTS_NAMESPACE);
  const instructorT = useTranslations(ORG_INSTRUCTOR_REPORTS_NAMESPACE);
  const memberT = useTranslations(ORG_MEMBER_DASHBOARD_REPORTS_NAMESPACE);

  const userReady = !isUserPending && user != null;
  const orgQuery = useOrganizationDashboardReports({
    enabled: showOrgReports && userReady,
    params,
  });
  const instructorQuery = useInstructorDashboardReports({
    enabled: showInstructorReports && userReady,
    params,
  });
  const memberQuery = useOrganizationMemberDashboardReports({
    enabled: showMemberReports && userReady,
    params,
  });

  if (isUserPending || !user) {
    return null;
  }

  if (showOrgReports) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="organization-reports-heading">
        <div className="px-0 lg:px-0">
          <h2 id="organization-reports-heading" className="text-lg font-semibold tracking-tight">
            {orgT('sectionTitle')}
          </h2>
        </div>
        <OrganizationDashboardReports
          data={orgQuery.data}
          isLoading={orgQuery.isLoading}
          isError={orgQuery.isError}
          error={orgQuery.error instanceof Error ? orgQuery.error : null}
          onRetry={() => void orgQuery.refetch()}
          reportsTranslationNamespace={ORG_DASHBOARD_REPORTS_NAMESPACE}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </section>
    );
  }

  if (showInstructorReports) {
    return (
      <section className="flex flex-col gap-4" aria-labelledby="instructor-reports-heading">
        <div className="px-0 lg:px-0">
          <h2 id="instructor-reports-heading" className="text-lg font-semibold tracking-tight">
            {instructorT('sectionTitle')}
          </h2>
        </div>
        <OrganizationDashboardReports
          data={instructorQuery.data}
          isLoading={instructorQuery.isLoading}
          isError={instructorQuery.isError}
          error={instructorQuery.error instanceof Error ? instructorQuery.error : null}
          onRetry={() => void instructorQuery.refetch()}
          reportsTranslationNamespace={ORG_INSTRUCTOR_REPORTS_NAMESPACE}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="org-member-reports-heading">
      <div className="px-0 lg:px-0">
        <h2 id="org-member-reports-heading" className="text-lg font-semibold tracking-tight">
          {memberT('sectionTitle')}
        </h2>
      </div>
      <OrganizationMemberDashboardReports
        data={memberQuery.data}
        isLoading={memberQuery.isLoading}
        isError={memberQuery.isError}
        error={memberQuery.error instanceof Error ? memberQuery.error : null}
        onRetry={() => void memberQuery.refetch()}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </section>
  );
}
