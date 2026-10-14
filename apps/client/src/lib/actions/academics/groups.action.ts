'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  GroupFormValues,
  GroupQuery,
  IGroup,
  IGroupDetail,
  IStudentCandidate,
  ITeacherCandidate,
} from '@/lib/types/academics/academics';

export async function getGroups(query: GroupQuery) {
  return createAuthorizedNatsRequest<IGroup[]>('academics.groups.findAll', query);
}
export async function getGroup(id: string) {
  return createAuthorizedNatsRequest<IGroupDetail>('academics.groups.findOne', { id });
}
export async function createGroup(data: GroupFormValues & { cohortId: string }) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.create', data);
}
export async function updateGroup(
  id: string,
  data: Partial<GroupFormValues> & { coordinatorId?: string | null; supervisorId?: string | null }
) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.update', { id, data });
}
export async function markGroupReady(id: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.markReady', { id });
}
export async function cancelGroup(id: string, reason: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.cancel', { id, reason });
}
export async function setContentSent(id: string, done: boolean) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.setContentSent', { id, done });
}
export async function getStudentCandidates(id: string, q: string) {
  return createAuthorizedNatsRequest<IStudentCandidate[]>('academics.groups.studentCandidates', {
    id,
    q,
  });
}
export async function addStudent(id: string, studentId: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.addStudent', { id, studentId });
}
export async function removeStudent(id: string, studentId: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.removeStudent', { id, studentId });
}
export async function setWhatsapp(id: string, studentId: string, whatsappAdded: boolean) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.setWhatsapp', {
    id,
    studentId,
    whatsappAdded,
  });
}
export async function assignTeacher(id: string, teacherId: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.assignTeacher', { id, teacherId });
}
export async function unassignTeacher(id: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.unassignTeacher', { id });
}
export async function getTeacherCandidates(id: string) {
  return createAuthorizedNatsRequest<ITeacherCandidate[]>('academics.groups.teacherCandidates', {
    id,
  });
}
