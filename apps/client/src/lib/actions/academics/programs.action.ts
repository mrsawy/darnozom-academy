'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICourseOption, IProgram, ITrainingCourse } from '@/lib/types/academics/academics';

export async function getPrograms() {
  return createAuthorizedNatsRequest<IProgram[]>('academics.programs.findAll', {});
}
export async function getProgram(id: string) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.findOne', { id });
}
export async function createProgram(data: { name: string; description?: string }) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.create', data);
}
export async function updateProgram(id: string, data: { name?: string; description?: string }) {
  return createAuthorizedNatsRequest<IProgram>('academics.programs.update', { id, data });
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
export async function createTrainingCourse(name: string) {
  return createAuthorizedNatsRequest<ICourseOption>('academics.programs.createCourse', { name });
}
export async function getTrainingCourse(id: string) {
  return createAuthorizedNatsRequest<ITrainingCourse>('academics.programs.findCourse', { id });
}
export async function updateTrainingCourse(id: string, name: string) {
  return createAuthorizedNatsRequest<{ _id: string; name: string }>(
    'academics.programs.updateCourse',
    { id, name }
  );
}
export async function deleteTrainingCourse(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('academics.programs.deleteCourse', { id });
}
export async function linkCourse(programId: string, courseId: string) {
  return createAuthorizedNatsRequest<{ programId: string; courseId: string }>(
    'academics.programs.linkCourse',
    { programId, courseId }
  );
}
export async function unlinkCourse(courseId: string) {
  return createAuthorizedNatsRequest<{ courseId: string }>('academics.programs.unlinkCourse', {
    courseId,
  });
}
