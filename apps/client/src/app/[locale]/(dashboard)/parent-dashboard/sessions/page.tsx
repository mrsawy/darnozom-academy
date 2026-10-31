'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/atoms/card';
import { ChildSessions } from '../children/__components/child-sessions';
import { useChildren } from '@/lib/hooks/parent/useParent.hook';
import { IconCalendarEvent, IconUsers } from '@tabler/icons-react';

export default function ParentSessionsPage() {
  const t = useTranslations('ParentDashboard');
  const tAcademics = useTranslations('Academics');
  const { data: children = [], isLoading } = useChildren();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <IconCalendarEvent className="text-primary h-7 w-7" />
          {t('sessionsAndReports')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{tAcademics('sessions.family.title')}</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <IconUsers className="text-muted-foreground mb-3 h-12 w-12 opacity-50" />
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {children.map((child) => (
            <ChildSessions key={child._id} childId={child._id} childName={child.firstName ?? ''} />
          ))}
        </div>
      )}
    </div>
  );
}
