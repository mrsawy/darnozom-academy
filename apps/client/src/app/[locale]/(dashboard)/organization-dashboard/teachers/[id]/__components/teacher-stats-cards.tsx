'use client';

import { useTranslations } from 'next-intl';
import { AttendanceStatus } from '@darnozom/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import type { ITeacherOverview } from '@/lib/types/academics/academics';

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card data-stat>
      <CardHeader className="pb-1">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{children}</p>
      </CardContent>
    </Card>
  );
}

export function TeacherStatsCards({ stats }: { stats: ITeacherOverview['stats'] }) {
  const t = useTranslations('Academics');
  const oneDecimal = (value: number) => Math.round(value * 10) / 10;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label={t('teacherPage.stats.total')}>{stats.total}</Stat>
        <Stat label={t('teacherPage.stats.completed')}>{stats.completed}</Stat>
        <Stat label={t('teacherPage.stats.cancelled')}>{stats.cancelled}</Stat>
        <Stat label={t('teacherPage.stats.reportsMissing')}>{stats.reportsMissing}</Stat>
        <Stat label={t('teacherPage.stats.avgJoinDelay')}>
          {stats.avgJoinDelayMinutes === null ? '—' : t('teacherPage.minutes', { count: Math.round(stats.avgJoinDelayMinutes) })}
        </Stat>
        <Stat label={t('teacherPage.stats.avgReportDelay')}>
          {stats.avgReportDelayHours === null ? '—' : t('teacherPage.hours', { count: oneDecimal(stats.avgReportDelayHours) })}
        </Stat>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Object.values(AttendanceStatus).map((status) => (
          <Stat key={status} label={t(`sessions.attendance.statuses.${status}`)}>
            {stats.attendance[status]}
          </Stat>
        ))}
        <Stat label={t('teacherPage.stats.unrecorded')}>{stats.attendance.UNRECORDED}</Stat>
      </div>
    </div>
  );
}
