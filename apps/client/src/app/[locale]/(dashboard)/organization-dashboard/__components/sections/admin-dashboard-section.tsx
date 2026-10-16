'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Roles } from '@darnozom/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useAdminDashboard } from '@/lib/hooks/dashboard/use-dashboard.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import {
  ROUTE_ORG_ACADEMICS_GROUPS,
  ROUTE_ORG_MY_SESSIONS,
  ROUTE_ORG_MY_TASKS,
  ROUTE_ORG_SHARIA_REVIEW,
  ROUTE_ORG_BILLING_RECEIPTS,
  ROUTE_ORG_BILLING_FAMILIES,
  ROUTE_ORG_PAYROLL,
  ROUTE_ORG_MY_CERTIFICATES,
} from '@/lib/data/constants/routes.constants';

function CountCard({ title, value, href }: { title: string; value: number | string; href: string }) {
  const t = useTranslations('AdminDashboard');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        <Link href={href} className="text-xs text-primary underline mt-1 block">
          {t('viewAll')}
        </Link>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardSection() {
  const t = useTranslations('AdminDashboard');
  const { data: counts, isLoading } = useAdminDashboard();
  const { data: user } = useAuthUser();

  const allUserRoles = [
    ...(user?.roleName ? [user.roleName] : []),
    ...((user?.additionalRoles as string[] | undefined) ?? []),
  ];

  const canSeeBilling = [
    Roles.SUPER_ADMIN,
    Roles.ADMIN,
    Roles.OWNER,
    Roles.MANAGER,
    Roles.ACCOUNTANT,
  ].some((r) => allUserRoles.includes(r as Roles));

  if (isLoading || !counts) {
    return <p className="p-4 text-muted-foreground">{t('loading')}</p>;
  }

  const groupTotal = Object.values(counts.groupsByStatus ?? {}).reduce((a, b) => a + b, 0);
  const todayTotal = Object.values(counts.todaySessions ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <CountCard title={t('groupsByStatus')} value={groupTotal} href={ROUTE_ORG_ACADEMICS_GROUPS} />
      <CountCard
        title={t('atRiskGroups')}
        value={counts.atRiskGroups}
        href={`${ROUTE_ORG_ACADEMICS_GROUPS}?atRisk=true`}
      />
      <CountCard title={t('todaySessions')} value={todayTotal} href={ROUTE_ORG_MY_SESSIONS} />
      <CountCard title={t('openTasks')} value={counts.openTasks} href={ROUTE_ORG_MY_TASKS} />
      <CountCard
        title={t('overdueTasks')}
        value={counts.overdueTasks}
        href={`${ROUTE_ORG_MY_TASKS}?overdue=true`}
      />
      <CountCard
        title={t('contentAwaitingShariaReview')}
        value={counts.contentAwaitingShariaReview}
        href={ROUTE_ORG_SHARIA_REVIEW}
      />
      {canSeeBilling && (
        <>
          <CountCard
            title={t('receiptsAwaitingReview')}
            value={counts.receiptsAwaitingReview}
            href={ROUTE_ORG_BILLING_RECEIPTS}
          />
          <CountCard
            title={t('outstandingBalance')}
            value={
              counts.outstandingBalance?.length
                ? counts.outstandingBalance.map((b) => `${b.amount} ${b.currency}`).join(' · ')
                : '0'
            }
            href={ROUTE_ORG_BILLING_FAMILIES}
          />
          <CountCard
            title={t('payStatementsAwaitingApproval')}
            value={counts.payStatementsAwaitingApproval}
            href={ROUTE_ORG_PAYROLL}
          />
        </>
      )}
      <CountCard
        title={t('certificatesAwaitingReview')}
        value={counts.certificatesAwaitingReview}
        href={ROUTE_ORG_MY_CERTIFICATES}
      />
    </div>
  );
}
