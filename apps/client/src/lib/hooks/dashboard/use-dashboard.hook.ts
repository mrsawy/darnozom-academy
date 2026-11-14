'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getAdminDashboard,
  getAdminOverview,
  getTeacherDashboard,
  getParentDashboard,
} from '@/lib/actions/dashboard/dashboard.action';

const ROOT = 'dashboard';

export const dashboardKeys = {
  all: [ROOT] as const,
  admin: () => [ROOT, 'admin'] as const,
  adminOverview: () => [ROOT, 'admin-overview'] as const,
  teacher: () => [ROOT, 'teacher'] as const,
  parent: () => [ROOT, 'parent'] as const,
};

export const useAdminDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.admin(), queryFn: () => getAdminDashboard(), enabled });

export const useAdminOverview = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.adminOverview(), queryFn: () => getAdminOverview(), enabled });

export const useTeacherDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.teacher(), queryFn: () => getTeacherDashboard(), enabled });

export const useParentDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.parent(), queryFn: () => getParentDashboard(), enabled });
