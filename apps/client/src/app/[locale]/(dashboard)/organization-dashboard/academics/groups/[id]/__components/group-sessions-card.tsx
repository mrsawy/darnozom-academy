'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SessionStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { SessionStatusBadge } from '@/components/organs/academics/session-status-badge';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';
import { useCancelSession, useSessions } from '@/lib/hooks/academics/use-academics.hook';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import { formatSessionTime } from '@/lib/utils/academics/session-time';
import { CancelSessionDialog } from './cancel-session-dialog';
import { EvaluateSessionDialog } from './evaluate-session-dialog';

export function GroupSessionsCard({
  group,
  canManage,
}: {
  group: IGroupDetail;
  canManage: boolean;
}) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: sessions = [], isLoading } = useSessions({ groupId: group._id });
  const cancelSession = useCancelSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sessions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">{t('sessions.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sessions.number')}</TableHead>
                <TableHead>{t('sessions.when')}</TableHead>
                <TableHead>{t('sessions.status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session._id}>
                  <TableCell>{session.sequence}</TableCell>
                  <TableCell>
                    {formatSessionTime(session.startsAt, locale, group.timezone)}
                  </TableCell>
                  <TableCell>
                    <SessionStatusBadge status={session.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={ROUTE_ORG_SESSION(session._id)}>{t('sessions.open')}</Link>
                      </Button>
                      {canManage && session.status === SessionStatus.SCHEDULED ? (
                        <CancelSessionDialog
                          pending={cancelSession.isPending}
                          onConfirm={(reason) => cancelSession.mutate({ id: session._id, reason })}
                        />
                      ) : null}
                      {session.status === SessionStatus.REPORT_PENDING ||
                      session.status === SessionStatus.COMPLETED ? (
                        <EvaluateSessionDialog session={session} />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
