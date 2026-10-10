'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ReportsParams } from '@/lib/types/reports/reports-params.types';
import type {
  InstructorDashboardReports,
  OrganizationDashboardReports,
  OrganizationMemberDashboardReports,
  StudentDashboardReports,
} from '@lms-organization/shared-types';

export async function getStudentDashboardReports(params?: ReportsParams) {
  return createAuthorizedNatsRequest<StudentDashboardReports | { err: { message: string } }>(
    'reports.studentDashboard',
    params ?? {}
  );
}

export async function getOrganizationDashboardReports(params?: ReportsParams) {
  return createAuthorizedNatsRequest<OrganizationDashboardReports | { err: { message: string } }>(
    'reports.organizationDashboard',
    params ?? {}
  );
}

export async function getInstructorDashboardReports(params?: ReportsParams) {
  return createAuthorizedNatsRequest<InstructorDashboardReports | { err: { message: string } }>(
    'reports.instructorDashboard',
    params ?? {}
  );
}

export async function getOrganizationMemberDashboardReports(params?: ReportsParams) {
  return createAuthorizedNatsRequest<
    OrganizationMemberDashboardReports | { err: { message: string } }
  >('reports.organizationMemberDashboard', params ?? {});
}
