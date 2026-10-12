'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import {
  useAssignTeacher,
  useTeacherCandidates,
  useUnassignTeacher,
} from '@/lib/hooks/academics/use-academics.hook';

export function TeacherCard({ group, disabled }: { group: IGroupDetail; disabled: boolean }) {
  const t = useTranslations('Academics');
  const { data: candidates = [] } = useTeacherCandidates(disabled ? '' : group._id);
  const assign = useAssignTeacher();
  const unassign = useUnassignTeacher();
  const [teacherId, setTeacherId] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('teacher.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.teacherId ? (
          <div className="flex items-center justify-between">
            <span className="font-medium">{group.people[group.teacherId] ?? group.teacherId}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || unassign.isPending}
              onClick={() => unassign.mutate(group._id)}>
              {t('teacher.unassign')}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">{t('groups.noTeacher')}</p>
        )}
        <div className="flex gap-2">
          <Select value={teacherId} onValueChange={setTeacherId} disabled={disabled}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder={t('teacher.select')} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem
                  key={candidate.teacherId}
                  value={candidate.teacherId}
                  disabled={!candidate.ok}>
                  {candidate.ok
                    ? candidate.name
                    : `${candidate.name} — ${candidate.reasons.map((r) => t(`teacher.reasons.${r}`)).join(', ')}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={disabled || !teacherId || assign.isPending}
            onClick={() =>
              assign.mutate({ id: group._id, teacherId }, { onSuccess: () => setTeacherId('') })
            }>
            {t('teacher.assign')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
