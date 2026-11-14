'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { EVALUATION_CRITERIA, type ITeacherOverview } from '@/lib/types/academics/academics';

export function TeacherEvaluationsCard({ evaluations }: { evaluations: ITeacherOverview['evaluations'] }) {
  const t = useTranslations('Academics');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('teacherPage.evaluations')}</CardTitle>
      </CardHeader>
      <CardContent>
        {evaluations.averages === null ? (
          <p className="text-muted-foreground text-sm">{t('teacherPage.noEvaluations')}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">{t('teacherPage.evaluationCount', { count: evaluations.count })}</p>
            <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {EVALUATION_CRITERIA.map((criterion) => (
                <div key={criterion} className="rounded-md border p-3">
                  <dt className="text-muted-foreground text-xs">{t(`teacherPage.criteria.${criterion}`)}</dt>
                  <dd className="text-xl font-semibold">{evaluations.averages?.[criterion]}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
