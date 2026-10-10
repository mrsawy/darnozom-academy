'use client';

import { LayoutDashboard, User, BookOpen } from 'lucide-react';
import {
  ROUTE_STUDENT_ACCOUNT,
  ROUTE_STUDENT_DASHBOARD,
  ROUTE_BOOKS,
} from '@/lib/data/constants/routes.constants';
import { IUser } from '@/types/user/user.interface';
import { DashboardSidebar } from '../../__components/dashboard-sidebar';

const NAV_ITEMS = [
  { href: ROUTE_STUDENT_DASHBOARD, icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: ROUTE_STUDENT_ACCOUNT, icon: User, labelKey: 'account' },
  { href: ROUTE_BOOKS, icon: BookOpen, labelKey: 'booksStore' },
] as const;

export function StudentSidebar({ user }: { user: IUser | null }) {
  return <DashboardSidebar user={user} items={NAV_ITEMS} namespace="studentDashboard.sidebar" />;
}
