'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ITask, ITasks, TaskQuery } from '@/lib/types/academics/academics';

export async function getMyTasks(query: TaskQuery) {
  return createAuthorizedNatsRequest<ITasks>('academics.tasks.listMine', query);
}

export async function getGroupTasks(groupId: string) {
  return createAuthorizedNatsRequest<ITasks>('academics.tasks.listForGroup', { groupId });
}

export async function markTaskDone(id: string) {
  return createAuthorizedNatsRequest<ITask>('academics.tasks.markDone', { id });
}
