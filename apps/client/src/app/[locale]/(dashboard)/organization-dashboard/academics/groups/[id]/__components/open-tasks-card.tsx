'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import type { ITask } from '@/lib/types/academics/academics';

export function OpenTasksCard({ tasks, isLoading }: { tasks: ITask[]; isLoading: boolean }) {
  const t = useTranslations('Academics');
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tasks.openTasks')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground">{t('tasks.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">
                    {t(`readiness.${task.readinessKey}` as 'readiness.CONTENT_SENT')}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t('tasks.due', { date: new Date(task.dueAt).toLocaleString(locale) })}
                  </p>
                </div>
                <Badge variant="outline">
                  {t(`tasks.level.${task.escalationLevel}` as 'tasks.level.0')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
