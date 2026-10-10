import type { OrganizationDashboardReports } from './organization-dashboard-reports.interface';

/**
 * Aggregated metrics for the authenticated instructor's courses in their organization
 * (NATS `reports.instructorDashboard`). Same shape as {@link OrganizationDashboardReports},
 * scoped to enrollments in courses the user teaches.
 */
export type InstructorDashboardReports = OrganizationDashboardReports;
