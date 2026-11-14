'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  IAdminDashboardCounts,
  IAdminOverview,
  ITeacherDashboardData,
  IParentDashboardData,
} from '@darnozom/shared-types';

export async function getAdminDashboard() {
  return createAuthorizedNatsRequest<IAdminDashboardCounts>('dashboard.admin', {});
}

export async function getAdminOverview() {
  return createAuthorizedNatsRequest<IAdminOverview>('dashboard.admin.overview', {});
}

export async function getTeacherDashboard() {
  return createAuthorizedNatsRequest<ITeacherDashboardData>('dashboard.teacher', {});
}

export async function getParentDashboard() {
  return createAuthorizedNatsRequest<IParentDashboardData>('dashboard.parent', {});
}
