'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICourseOption, IProgram } from '@/lib/types/academics/academics';

export async function getPrograms() {
  return createAuthorizedNatsRequest<IProgram[]>('academics.programs.findAll', {});
}
export async function getProgram(id: string) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.findOne', { id });
}
export async function createProgram(data: { name: string; description?: string }) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.create', data);
}
export async function deleteProgram(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.programs.delete', { id });
}
export async function getProgramCourses(id: string) {
  return createAuthorizedNatsRequest<ICourseOption[]>('academics.programs.findCourses', { id });
}
export async function getCourseOptions() {
  return createAuthorizedNatsRequest<ICourseOption[]>('academics.programs.courseOptions', {});
}
export async function linkCourse(programId: string, courseId: string) {
  return createAuthorizedNatsRequest<{ programId: string; courseId: string }>('academics.programs.linkCourse', { programId, courseId });
}
export async function unlinkCourse(courseId: string) {
  return createAuthorizedNatsRequest<{ courseId: string }>('academics.programs.unlinkCourse', { courseId });
}
