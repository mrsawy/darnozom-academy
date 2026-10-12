'use client';

import { useTranslations } from 'next-intl';
import type { ISession } from '@/lib/types/academics/academics';

const CRITERIA = ['participation', 'understanding', 'behavior', 'homework'] as const;

export function ReportView({
  report,
  people,
}: {
  report: NonNullable<ISession['report']>;
  people: Record<string, string>;
}) {
  const t = useTranslations('Academics');
  return (
    <div className="space-y-3">
      {report.summary ? <p>{report.summary}</p> : null}
      <ul className="space-y-2">
        {report.evaluations.map((evaluation) => (
          <li key={evaluation.studentId} className="rounded-md border p-3">
            <p className="font-medium">{people[evaluation.studentId] ?? evaluation.studentId}</p>
            <p className="text-sm">
              {CRITERIA.map(
                (criterion) => `${t(`sessions.report.${criterion}`)}: ${evaluation[criterion]}`
              ).join(' · ')}
            </p>
            {evaluation.note ? (
              <p className="text-muted-foreground text-sm">{evaluation.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
