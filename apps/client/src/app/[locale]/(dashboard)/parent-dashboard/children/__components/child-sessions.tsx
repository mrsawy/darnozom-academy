'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { SessionSummaryList } from '@/components/organs/academics/session-summary-list';
import { useSessions } from '@/lib/hooks/academics/use-academics.hook';

export function ChildSessions({ childId, childName }: { childId: string; childName: string }) {
  const t = useTranslations('Academics');
  const { data: sessions = [], isLoading } = useSessions({ childId });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${childName} — ${t('sessions.family.title')}`}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : (
          <SessionSummaryList sessions={sessions} studentId={childId} />
        )}
      </CardContent>
    </Card>
  );
}
