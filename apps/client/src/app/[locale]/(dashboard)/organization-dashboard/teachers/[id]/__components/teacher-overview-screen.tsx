'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { useTeacherOverview } from '@/lib/hooks/academics/use-academics.hook';
import { TeacherEvaluationsCard } from './teacher-evaluations-card';
import { TeacherSessionsTable } from './teacher-sessions-table';
import { TeacherStatsCards } from './teacher-stats-cards';

export function TeacherOverviewScreen({ teacherId }: { teacherId: string }) {
  const t = useTranslations('Academics');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, error } = useTeacherOverview({
    id: teacherId,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  if (isLoading) return <LoadingState fullPage />;
  if (error || !data) return <p className="text-destructive p-4">{error?.message ?? t('teacherPage.unavailable')}</p>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.teacher.name}</h1>
          <p className="text-muted-foreground text-sm">{[data.teacher.email, data.teacher.phone].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="teacher-from">{t('teacherPage.from')}</Label>
            <Input id="teacher-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="teacher-to">{t('teacherPage.to')}</Label>
            <Input id="teacher-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <TeacherStatsCards stats={data.stats} />

      <Card>
        <CardHeader>
          <CardTitle>{t('teacherPage.groups')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('teacherPage.noGroups')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {data.groups.map((group) => (
                <li key={group.id}>
                  <Link href={ROUTE_ORG_ACADEMICS_GROUP(group.id)} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                    {group.name}
                    <Badge variant="secondary">{t('teacherPage.students', { count: group.activeStudents })}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TeacherSessionsTable sessions={data.recentSessions} />
      <TeacherEvaluationsCard evaluations={data.evaluations} />
    </div>
  );
}
