'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useTranslations } from 'next-intl';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';

export default function StudentMyGroupsPage() {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({});
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('myGroups.title')}</h1>
      {isLoading ? <LoadingState /> : <GroupSummaryList groups={groups} />}
    </div>
  );
}
