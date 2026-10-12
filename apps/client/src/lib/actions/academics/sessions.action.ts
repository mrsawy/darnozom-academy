'use server';

import type { AttendanceStatus } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  AttendanceEntry,
  IGroup,
  ISession,
  ISessionDetail,
  ReportValues,
  SessionQuery,
} from '@/lib/types/academics/academics';

export async function getSessions(query: SessionQuery) {
  return createAuthorizedNatsRequest<ISession[]>('academics.sessions.findAll', query);
}
export async function getSession(id: string) {
  return createAuthorizedNatsRequest<ISessionDetail>('academics.sessions.findOne', { id });
}
export async function startGroup(id: string) {
  return createAuthorizedNatsRequest<IGroup>('academics.groups.start', { id });
}
export async function cancelSession(id: string, reason: string) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.cancel', { id, reason });
}
export async function markAttendance(id: string, entries: AttendanceEntry[]) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.markAttendance', {
    id,
    entries,
  });
}
export async function markTeacherAttendance(id: string, status: AttendanceStatus) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.markTeacherAttendance', {
    id,
    status,
  });
}
export async function submitReport(id: string, data: ReportValues) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.submitReport', { id, data });
}
export async function editReport(id: string, data: ReportValues) {
  return createAuthorizedNatsRequest<ISession>('academics.sessions.editReport', { id, data });
}
