'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Roles } from '@darnozom/shared-types';
import type { IOverviewStudentStat, IOverviewTeacherStat } from '@darnozom/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { useAdminDashboard, useAdminOverview } from '@/lib/hooks/dashboard/use-dashboard.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import {
  ROUTE_ORG_ACADEMICS_GROUPS,
  ROUTE_ORG_ACADEMICS_PROGRAM,
  ROUTE_ORG_ACADEMICS_PROGRAMS,
  ROUTE_ORG_BILLING_RECEIPTS,
  ROUTE_ORG_MY_CERTIFICATES,
  ROUTE_ORG_MY_TASKS,
  ROUTE_ORG_PAYROLL,
  ROUTE_ORG_SHARIA_REVIEW,
  ROUTE_ORG_USERS,
} from '@/lib/data/constants/routes.constants';

function Kpi({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-accent/40 h-full transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

type Ranked = { id: string; name: string; score: number | null; attendance: number | null; meta: string };

function RankList({ title, rows, tone }: { title: string; rows: Ranked[]; tone: 'good' | 'bad' }) {
  const t = useTranslations('AdminDashboard.overview');
  return (
    <div className="flex flex-col gap-2">
      <h4
        className={
          tone === 'good'
            ? 'text-sm font-semibold text-emerald-600 dark:text-emerald-400'
            : 'text-sm font-semibold text-red-600 dark:text-red-400'
        }>
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noData')}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-muted-foreground text-xs">{r.meta}</p>
              </div>
              <div className="shrink-0 text-end tabular-nums">
                <p className="font-semibold">{r.score === null ? '—' : `${r.score}/5`}</p>
                <p className="text-muted-foreground text-xs">
                  {t('attendance')}: {pct(r.attendance)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminDashboardSection() {
  const t = useTranslations('AdminDashboard');
  const { data: overview, isLoading } = useAdminOverview();
  const { data: counts } = useAdminDashboard();
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

  if (isLoading) {
    return <LoadingState fullPage />;
  }
  if (!overview || 'err' in overview) {
    return <p className="text-muted-foreground p-4">{t('failedToLoadStats')}</p>;
  }

  const teacherRow = (x: IOverviewTeacherStat): Ranked => ({
    id: x.teacherId,
    name: x.name,
    score: x.avgScore,
    attendance: x.attendanceRate,
    meta: t('overview.teacherMeta', { groups: x.groups, students: x.students }),
  });
  const studentRow = (x: IOverviewStudentStat): Ranked => ({
    id: x.studentId,
    name: x.name,
    score: x.avgScore,
    attendance: x.attendanceRate,
    meta: '',
  });

  // Only things that actually need action; zero items stay out of the way.
  const attention =
    counts && !('err' in counts)
      ? [
          { key: 'overdueTasks', value: counts.overdueTasks, href: `${ROUTE_ORG_MY_TASKS}?overdue=true` },
          {
            key: 'contentAwaitingShariaReview',
            value: counts.contentAwaitingShariaReview,
            href: ROUTE_ORG_SHARIA_REVIEW,
          },
          {
            key: 'certificatesAwaitingReview',
            value: counts.certificatesAwaitingReview,
            href: ROUTE_ORG_MY_CERTIFICATES,
          },
          ...(canSeeBilling
            ? [
                {
                  key: 'receiptsAwaitingReview',
                  value: counts.receiptsAwaitingReview,
                  href: ROUTE_ORG_BILLING_RECEIPTS,
                },
                {
                  key: 'payStatementsAwaitingApproval',
                  value: counts.payStatementsAwaitingApproval,
                  href: ROUTE_ORG_PAYROLL,
                },
              ]
            : []),
        ].filter((a) => a.value > 0)
      : [];

  const { totals } = overview;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi title={t('overview.programs')} value={totals.programs} href={ROUTE_ORG_ACADEMICS_PROGRAMS} />
        <Kpi title={t('overview.runningGroups')} value={totals.runningGroups} href={ROUTE_ORG_ACADEMICS_GROUPS} />
        <Kpi title={t('overview.activeStudents')} value={totals.activeStudents} href={ROUTE_ORG_USERS} />
        <Kpi title={t('overview.teachers')} value={totals.teachers} href={ROUTE_ORG_USERS} />
        <Kpi
          title={t('atRiskGroups')}
          value={totals.atRiskGroups}
          href={`${ROUTE_ORG_ACADEMICS_GROUPS}?atRisk=true`}
        />
      </div>

      {attention.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">{t('overview.needsAttention')}</span>
          {attention.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className="bg-accent hover:bg-accent/70 rounded-full border px-3 py-1 text-xs font-medium">
              {t(a.key)}: <span className="font-bold tabular-nums">{a.value}</span>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('overview.programsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('overview.noPrograms')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-start text-xs">
                  <tr>
                    <th className="py-2 text-start font-medium">{t('overview.programs')}</th>
                    <th className="py-2 text-end font-medium">{t('overview.groups')}</th>
                    <th className="py-2 text-end font-medium">{t('overview.runningGroups')}</th>
                    <th className="py-2 text-end font-medium">{t('overview.activeStudents')}</th>
                    <th className="py-2 text-end font-medium">{t('overview.attendance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overview.programs.map((p) => (
                    <tr key={p.programId}>
                      <td className="py-2 font-medium">
                        <Link href={ROUTE_ORG_ACADEMICS_PROGRAM(p.programId)} className="hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 text-end tabular-nums">{p.groups}</td>
                      <td className="py-2 text-end tabular-nums">{p.runningGroups}</td>
                      <td className="py-2 text-end tabular-nums">{p.students}</td>
                      <td className="py-2 text-end tabular-nums">{pct(p.attendanceRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('overview.teachersTitle')}</CardTitle>
            <CardDescription>{t('overview.teachersHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RankList title={t('overview.best')} rows={overview.topTeachers.map(teacherRow)} tone="good" />
            <RankList title={t('overview.needsSupport')} rows={overview.bottomTeachers.map(teacherRow)} tone="bad" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('overview.studentsTitle')}</CardTitle>
            <CardDescription>{t('overview.studentsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RankList title={t('overview.best')} rows={overview.topStudents.map(studentRow)} tone="good" />
            <RankList title={t('overview.needsSupport')} rows={overview.bottomStudents.map(studentRow)} tone="bad" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
