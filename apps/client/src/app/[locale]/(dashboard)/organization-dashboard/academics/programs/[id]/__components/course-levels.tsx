'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  useCreateLevel,
  useDeleteLevel,
  useLevels,
} from '@/lib/hooks/academics/use-academics.hook';
import { LevelCohorts } from './level-cohorts';

export function CourseLevels({ courseId }: { courseId: string }) {
  const t = useTranslations('Academics');
  const { data: levels = [] } = useLevels(courseId);
  const createLevel = useCreateLevel();
  const deleteLevel = useDeleteLevel();
  const [name, setName] = useState('');
  const [order, setOrder] = useState(String(levels.length + 1));

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{t('programs.levels')}</h3>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createLevel.mutate(
            { courseId, name, order: Number(order) },
            { onSuccess: () => setName('') }
          );
        }}>
        <Input
          className="w-48"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name')}
          required
        />
        <Input
          className="w-24"
          type="number"
          min={1}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder={t('order')}
          required
        />
        <Button type="submit" size="sm" disabled={!name.trim() || createLevel.isPending}>
          {t('programs.newLevel')}
        </Button>
      </form>
      {levels.map((level) => (
        <div key={level._id} className="ms-4 space-y-2 border-s ps-4">
          <div className="flex items-center gap-3">
            <span className="font-medium">{`${level.order}. ${level.name}`}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (globalThis.confirm(t('confirmDelete'))) deleteLevel.mutate(level._id);
              }}>
              {t('delete')}
            </Button>
          </div>
          <LevelCohorts levelId={level._id} />
        </div>
      ))}
    </div>
  );
}
