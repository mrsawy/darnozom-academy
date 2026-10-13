'use client';

import { useTranslations } from 'next-intl';
import { useMarkTaskDone, useMyTasks } from '@/lib/hooks/academics/use-academics.hook';
import { MyTasksList } from './__components/my-tasks-list';

function TasksContent() {
  const { data: tasks = [], isLoading } = useMyTasks({});
  const { mutate: markDone } = useMarkTaskDone();
  return <MyTasksList tasks={tasks} isLoading={isLoading} onMarkDone={(id) => markDone(id)} />;
}

export default function MyTasksPage() {
  const t = useTranslations('Academics');
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('tasks.title')}</h1>
      <TasksContent />
    </div>
  );
}
