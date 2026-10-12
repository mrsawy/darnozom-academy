'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ISession } from '@/lib/types/academics/academics';
import { formatSessionTime } from '@/lib/utils/academics/session-time';
import { SessionStatusBadge } from './session-status-badge';

const CRITERIA = ['participation', 'understanding', 'behavior', 'homework'] as const;

/** Defence in depth: only the given student's rows are shown, even though the server already removed everyone else's. */
export function SessionSummaryList({
  sessions,
  studentId,
}: {
  sessions: ISession[];
  studentId: string;
}) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  if (sessions.length === 0)
    return <p className="text-muted-foreground">{t('sessions.family.empty')}</p>;

  return (
    <ul className="space-y-3">
      {sessions.map((session) => {
        const attendance = session.attendance.find((entry) => entry.studentId === studentId);
        const evaluation = session.report?.evaluations.find(
          (entry) => entry.studentId === studentId
        );
        return (
          <li key={session._id} className="space-y-1 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="font-medium">{session.groupName}</span>
                <span className="text-muted-foreground text-sm">· #{session.sequence}</span>
              </div>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {formatSessionTime(session.startsAt, locale)}
            </p>
            <p className="text-sm">
              {t('sessions.family.attendance')}:{' '}
              <span>
                {attendance
                  ? t(`sessions.attendance.statuses.${attendance.status}`)
                  : t('sessions.family.notRecorded')}
              </span>
            </p>
            <p className="text-sm">
              {t('sessions.family.evaluation')}:{' '}
              <span>
                {evaluation
                  ? CRITERIA.map(
                      (criterion) =>
                        `${t(`sessions.report.${criterion}`)}: ${evaluation[criterion]}`
                    ).join(' · ')
                  : t('sessions.family.notRecorded')}
              </span>
            </p>
            {evaluation?.note ? (
              <p className="text-muted-foreground text-sm">{evaluation.note}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
