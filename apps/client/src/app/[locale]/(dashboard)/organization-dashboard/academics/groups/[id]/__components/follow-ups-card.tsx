'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FollowUpDecision } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { useFollowUps, useUpdateFollowUp } from '@/lib/hooks/academics/use-academics.hook';
import type { IFollowUp } from '@/lib/types/academics/academics';

function FollowUpRow({ row, name }: { row: IFollowUp; name: string }) {
  const t = useTranslations('Academics');
  const update = useUpdateFollowUp();
  const [feedback, setFeedback] = useState(row.parentFeedback ?? '');
  const [decision, setDecision] = useState<FollowUpDecision | ''>(row.decision ?? '');

  const save = () => {
    const data: { parentFeedback?: string; decision?: FollowUpDecision } = {};
    if (feedback.trim()) data.parentFeedback = feedback.trim();
    if (decision) data.decision = decision;
    update.mutate({ id: row._id, data });
  };

  return (
    <li className="space-y-2 rounded-md border p-3">
      <p className="font-medium">{name}</p>
      <Textarea
        aria-label={t('followUps.parentFeedback')}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={decision} onValueChange={(value) => setDecision(value as FollowUpDecision)}>
          <SelectTrigger className="w-48" aria-label={t('followUps.decision')}>
            <SelectValue placeholder={t('followUps.undecided')} />
          </SelectTrigger>
          <SelectContent>
            {Object.values(FollowUpDecision).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`followUps.decisions.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={update.isPending || (!feedback.trim() && !decision)}
          onClick={save}>
          {t('followUps.save')}
        </Button>
        {row.decision ? (
          <span className="text-muted-foreground text-sm">{t('followUps.recorded')}</span>
        ) : null}
      </div>
    </li>
  );
}

export function FollowUpsCard({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data, isLoading } = useFollowUps(groupId);
  const rows = data?.rows ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('followUps.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">{t('followUps.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <FollowUpRow
                key={row._id}
                row={row}
                name={data?.people[row.studentId] ?? row.studentId}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
