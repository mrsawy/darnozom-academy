'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { EvaluationList } from '@/components/organs/academics/evaluation-list';
import { useEvaluations } from '@/lib/hooks/academics/use-academics.hook';

export default function MyEvaluationsPage() {
  const t = useTranslations('Academics');
  // The server pins a teacher to their own rows, so no filter is needed here.
  const { data: evaluations = [], isLoading } = useEvaluations({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('supervision.myEvaluations')}</CardTitle>
      </CardHeader>
      <CardContent>
        <EvaluationList evaluations={evaluations} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
