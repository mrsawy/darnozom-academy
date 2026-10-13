'use client';

import { useTranslations } from 'next-intl';
import type { ITask } from '@/lib/types/academics/academics';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';

interface Props {
  tasks: ITask[];
  isLoading: boolean;
  onMarkDone: (id: string) => void;
}

export function MyTasksList({ tasks, isLoading, onMarkDone }: Props) {
  const t = useTranslations('Academics');

  if (isLoading) return <p>{t('loading')}</p>;
  if (tasks.length === 0) return <p className="text-muted-foreground">{t('tasks.empty')}</p>;

  return (
    <ul className="divide-y rounded-lg border">
      {tasks.map((task) => (
        <li key={task._id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{task.groupName}</p>
            <p className="text-muted-foreground text-sm">{task.readinessKey}</p>
            <p className="text-muted-foreground text-sm">
              {t('tasks.due', { date: new Date(task.dueAt).toLocaleDateString() })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">
              {t(`tasks.level.${task.escalationLevel}` as 'tasks.level.0')}
            </Badge>
            <Button size="sm" onClick={() => onMarkDone(task._id)}>
              {t('tasks.markDone')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
