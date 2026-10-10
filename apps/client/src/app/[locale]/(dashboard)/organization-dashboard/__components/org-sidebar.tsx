'use client';

import { LayoutDashboard, User, Users, Settings, BookOpen } from 'lucide-react';
import {
  ROUTE_ORGANIZATION_DASHBOARD,
  ROUTE_ORG_ACCOUNT,
  ROUTE_ORG_USERS,
  ROUTE_ORG_SETTINGS,
  ROUTE_BOOKS,
} from '@/lib/data/constants/routes.constants';
import { IUser } from '@/types/user/user.interface';
import { DashboardSidebar } from '../../__components/dashboard-sidebar';

const NAV_ITEMS = [
  { href: ROUTE_ORGANIZATION_DASHBOARD, icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: ROUTE_ORG_ACCOUNT, icon: User, labelKey: 'account' },
  { href: ROUTE_ORG_USERS, icon: Users, labelKey: 'users' },
  { href: ROUTE_ORG_SETTINGS, icon: Settings, labelKey: 'settings' },
  { href: ROUTE_BOOKS, icon: BookOpen, labelKey: 'booksStore' },
] as const;

export function OrgSidebar({ user }: { user: IUser | null }) {
  return <DashboardSidebar user={user} items={NAV_ITEMS} namespace="dashboard.sidebar" />;
}
