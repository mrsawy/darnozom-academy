'use client';

import { LayoutDashboard, User, Users, BookOpen } from 'lucide-react';
import {
  ROUTE_PARENT_ACCOUNT,
  ROUTE_PARENT_CHILDREN,
  ROUTE_PARENT_DASHBOARD,
  ROUTE_BOOKS,
} from '@/lib/data/constants/routes.constants';
import { IUser } from '@/types/user/user.interface';
import { DashboardSidebar } from '../../__components/dashboard-sidebar';

const NAV_ITEMS = [
  { href: ROUTE_PARENT_DASHBOARD, icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: ROUTE_PARENT_CHILDREN, icon: Users, labelKey: 'children' },
  { href: ROUTE_PARENT_ACCOUNT, icon: User, labelKey: 'account' },
  { href: ROUTE_BOOKS, icon: BookOpen, labelKey: 'booksStore' },
] as const;

export function ParentSidebar({ user }: { user: IUser | null }) {
  return <DashboardSidebar user={user} items={NAV_ITEMS} namespace="parentDashboard.sidebar" />;
}
