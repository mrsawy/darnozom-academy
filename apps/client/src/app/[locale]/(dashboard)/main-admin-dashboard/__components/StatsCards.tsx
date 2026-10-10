'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  IconCategory,
  IconBook,
  IconStack2,
  IconFileText,
  IconBuilding,
  IconUsers,
} from '@tabler/icons-react';
import {
  ROUTE_MAIN_ADMIN_CATEGORIES,
  ROUTE_MAIN_ADMIN_COURSES,
  ROUTE_MAIN_ADMIN_MODULES,
  ROUTE_MAIN_ADMIN_CONTENT,
  ROUTE_MAIN_ADMIN_ORGANIZATIONS,
} from '@/lib/data/constants/routes.constants';
import type { IDashboardStats } from '@/lib/types/admin-review/admin-review.interface';

interface StatsCardsProps {
  stats: IDashboardStats;
}

const CARDS_CONFIG = [
  {
    key: 'pendingCategories' as const,
    tKey: 'pendingCategories' as const,
    icon: IconCategory,
    color: 'text-orange-500',
    href: ROUTE_MAIN_ADMIN_CATEGORIES,
  },
  {
    key: 'pendingCourses' as const,
    tKey: 'pendingCourses' as const,
    icon: IconBook,
    color: 'text-blue-500',
    href: ROUTE_MAIN_ADMIN_COURSES,
  },
  {
    key: 'pendingModules' as const,
    tKey: 'pendingModules' as const,
    icon: IconStack2,
    color: 'text-purple-500',
    href: ROUTE_MAIN_ADMIN_MODULES,
  },
  {
    key: 'pendingContents' as const,
    tKey: 'pendingContents' as const,
    icon: IconFileText,
    color: 'text-emerald-500',
    href: ROUTE_MAIN_ADMIN_CONTENT,
  },
  {
    key: 'totalOrganizations' as const,
    tKey: 'totalOrganizations' as const,
    icon: IconBuilding,
    color: 'text-slate-500',
    href: ROUTE_MAIN_ADMIN_ORGANIZATIONS,
  },
  {
    key: 'totalUsers' as const,
    tKey: 'totalUsers' as const,
    icon: IconUsers,
    color: 'text-pink-500',
    href: undefined,
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  const t = useTranslations('AdminDashboard.stats');

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS_CONFIG.map(({ key, tKey, icon: Icon, color, href }) => {
        const content = (
          <Card className={href ? 'hover:border-primary/50 cursor-pointer transition-colors' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t(tKey)}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats[key]}</div>
            </CardContent>
          </Card>
        );

        return href ? (
          <Link key={key} href={href}>
            {content}
          </Link>
        ) : (
          <div key={key}>{content}</div>
        );
      })}
    </div>
  );
}
