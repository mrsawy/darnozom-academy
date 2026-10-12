'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';

export function ChildGroups({ childId, childName }: { childId: string; childName: string }) {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({ childId });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${childName} — ${t('childGroups.title')}`}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <p>{t('loading')}</p> : <GroupSummaryList groups={groups} />}
      </CardContent>
    </Card>
  );
}
