'use client';

import { useTranslations } from 'next-intl';
import { GroupSummaryList } from '@/components/organs/academics/group-summary-list';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';

/** Filters by teacherId: staff who also teach would otherwise get their org-wide scope here. */
function TaughtGroups({ teacherId }: { teacherId: string }) {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({ teacherId });
  return isLoading ? <p>{t('loading')}</p> : <GroupSummaryList groups={groups} />;
}

export default function MyGroupsPage() {
  const t = useTranslations('Academics');
  const { data: user } = useAuthUser();
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('myGroups.title')}</h1>
      {user ? <TaughtGroups teacherId={user._id} /> : <p>{t('loading')}</p>}
    </div>
  );
}
