'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICohort, ILevel } from '@/lib/types/academics/academics';

export async function getLevels(courseId: string) {
  return createAuthorizedNatsRequest<ILevel[]>('academics.levels.findAll', { courseId });
}
export async function createLevel(data: { courseId: string; name: string; order: number }) {
  return createAuthorizedNatsRequest<ILevel>('academics.levels.create', data);
}
export async function deleteLevel(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.levels.delete', { id });
}
export async function getCohorts(levelId: string) {
  return createAuthorizedNatsRequest<ICohort[]>('academics.cohorts.findAll', { levelId });
}
export async function createCohort(data: { levelId: string; name: string; startDate: string }) {
  return createAuthorizedNatsRequest<ICohort>('academics.cohorts.create', data);
}
export async function deleteCohort(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.cohorts.delete', { id });
}
