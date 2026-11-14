'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { use } from 'react';
import { useTranslations } from 'next-intl';
import { usePrivateSessionById } from '@/lib/hooks/private-sessions/private-sessions.hook';
import { PrivateSessionForm } from '../../__components/private-session-form/private-session-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditPrivateSessionPage({ params }: Props) {
  const t = useTranslations('PrivateSessions');
  const { id } = use(params);
  const { data: session, isLoading } = usePrivateSessionById(id);

  if (isLoading) return <LoadingState fullPage />;
  if (!session)
    return <div className="text-muted-foreground p-6 text-center">{t('sessionNotFound')}</div>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <PrivateSessionForm session={session} />
    </div>
  );
}
