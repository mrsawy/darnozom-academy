'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ITeacherOverview, TeacherOverviewQuery } from '@/lib/types/academics/academics';

export async function getTeacherOverview(query: TeacherOverviewQuery) {
  return createAuthorizedNatsRequest<ITeacherOverview>('academics.teachers.overview', query);
}
