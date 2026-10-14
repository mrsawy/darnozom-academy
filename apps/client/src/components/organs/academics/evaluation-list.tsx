'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import type { ISupervisionEvaluation } from '@/lib/types/academics/academics';

export function EvaluationList({
  evaluations,
  isLoading,
}: {
  evaluations: ISupervisionEvaluation[];
  isLoading: boolean;
}) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  if (isLoading) return <p>{t('loading')}</p>;
  if (evaluations.length === 0)
    return <p className="text-muted-foreground">{t('supervision.empty')}</p>;

  return (
    <ul className="space-y-3">
      {evaluations.map((evaluation) => (
        <li key={evaluation._id} className="space-y-1 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{evaluation.groupName}</span>
            <span className="text-muted-foreground text-sm">{`#${evaluation.sessionSequence}`}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date(evaluation.sessionStartsAt).toLocaleString(locale)}
          </p>
          <p className="text-sm">
            {SUPERVISION_CRITERIA.map(
              (criterion) => `${t(`supervision.criteria.${criterion}`)}: ${evaluation[criterion]}`
            ).join(' · ')}
          </p>
          {evaluation.notes?.general ? (
            <p className="text-muted-foreground text-sm">{evaluation.notes.general}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
