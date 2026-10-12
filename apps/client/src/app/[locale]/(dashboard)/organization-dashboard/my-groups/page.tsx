'use client';

import { useTranslations } from 'next-intl';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';

export default function MyGroupsPage() {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({});
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('myGroups.title')}</h1>
      {isLoading ? <p>{t('loading')}</p> : <GroupSummaryList groups={groups} />}
    </div>
  );
}
