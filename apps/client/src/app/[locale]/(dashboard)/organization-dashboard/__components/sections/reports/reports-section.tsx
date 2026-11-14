'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Roles } from '@darnozom/shared-types';
import { OrganizationDashboardReports } from '@/components/molecules/reports/organization-dashboard-reports';
import { ORG_INSTRUCTOR_REPORTS_NAMESPACE } from '@/components/molecules/reports/organization-dashboard-reports/organization-dashboard-reports.types';
import {
  OrganizationMemberDashboardReports,
  ORG_MEMBER_DASHBOARD_REPORTS_NAMESPACE,
} from '@/components/molecules/reports/organization-member-dashboard-reports';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { useInstructorDashboardReports } from '@/lib/hooks/reports/use-instructor-dashboard-reports';
import { useOrganizationMemberDashboardReports } from '@/lib/hooks/reports/use-organization-member-dashboard-reports';
import {
  resolveReportsParams,
  type ReportsFilters,
} from '@/lib/types/reports/reports-params.types';
import { AdminDashboardSection } from '../admin-dashboard-section';

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

  const instructorT = useTranslations(ORG_INSTRUCTOR_REPORTS_NAMESPACE);
  const memberT = useTranslations(ORG_MEMBER_DASHBOARD_REPORTS_NAMESPACE);

  const userReady = !isUserPending && user != null;
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
    // Admins get the focused academy overview (programmes, groups, teachers, students)
    // instead of the generic course-enrollment / revenue chart wall.
    return <AdminDashboardSection />;
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
