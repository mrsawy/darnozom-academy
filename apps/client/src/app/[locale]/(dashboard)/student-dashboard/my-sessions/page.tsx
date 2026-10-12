'use client';

import { useTranslations } from 'next-intl';
import { SessionSummaryList } from '@/components/organs/academics/session-summary-list';
import { useSessions } from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';

export default function StudentMySessionsPage() {
  const t = useTranslations('Academics');
  const { data: user } = useAuthUser();
  const { data: sessions = [], isLoading } = useSessions({}, !!user);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('sessions.family.title')}</h1>
      {isLoading || !user ? (
        <p>{t('loading')}</p>
      ) : (
        <SessionSummaryList sessions={sessions} studentId={user._id} />
      )}
    </div>
  );
}
