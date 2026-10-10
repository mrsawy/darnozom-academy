'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/atoms/card';
import { DeleteConfirmationModal } from '@/components/molecules/modals';
import {
  ROUTE_ORG_PRIVATE_SESSION_CREATE,
  ROUTE_ORG_PRIVATE_SESSION_DETAIL,
  ROUTE_ORG_PRIVATE_SESSION_EDIT,
} from '@/lib/data/constants/routes.constants';
import {
  useMyPrivateSessions,
  useDeletePrivateSession,
} from '@/lib/hooks/private-sessions/private-sessions.hook';
import { SessionType } from '@/lib/types/private-session/private-session.interface';

export default function PrivateSessionsPage() {
  const t = useTranslations('PrivateSessions');
  const { data, isLoading } = useMyPrivateSessions();
  const deleteMutation = useDeletePrivateSession();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const sessions = data?.docs ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild>
          <Link href={ROUTE_ORG_PRIVATE_SESSION_CREATE}>{t('createSession')}</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40" />
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && sessions.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t('noSessions')}</p>
          <Button className="mt-4" asChild>
            <Link href={ROUTE_ORG_PRIVATE_SESSION_CREATE}>{t('createSession')}</Link>
          </Button>
        </div>
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session._id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{session.title}</CardTitle>
                  <Badge variant={session.isActive ? 'default' : 'secondary'}>
                    {session.isActive ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <CardDescription>
                  {t('durationMinutes', { count: session.duration })} ·{' '}
                  {session.sessionType === SessionType.ONLINE
                    ? t('form.online')
                    : t('form.offline')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="text-lg font-semibold">
                  {session.pricing.price} {session.pricing.currency}
                </div>
                {session.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {session.description}
                  </p>
                ) : null}
                <div className="text-muted-foreground text-sm">
                  {t('slotsAvailable', { count: session.availableSlots.length })}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={ROUTE_ORG_PRIVATE_SESSION_DETAIL(session._id)}>{t('view')}</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={ROUTE_ORG_PRIVATE_SESSION_EDIT(session._id)}>
                      {t('editSession')}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteTarget(session._id)}>
                    {t('deleteSession')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
        title={t('deleteConfirm.title')}
        description={t('deleteConfirm.description')}
      />
    </div>
  );
}
