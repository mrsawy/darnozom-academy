import type { StudentDashboardReports } from './student-dashboard-reports.interface';

/**
 * Personal learning metrics for the current user, scoped to enrollments in their
 * organization only (NATS `reports.organizationMemberDashboard`).
 *
 * Shape matches {@link StudentDashboardReports}; aggregation filters by `organizationId`.
 */
export type OrganizationMemberDashboardReports = StudentDashboardReports;
