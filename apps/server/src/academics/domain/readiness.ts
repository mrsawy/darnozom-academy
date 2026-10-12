import { GroupPaymentStatus, GroupStudentStatus, Readiness, ReadinessKey } from '@darnozom/shared-types';

export interface ReadinessInput {
  teacherId?: unknown;
  minStudents: number;
  students?: { paymentStatus: string; status?: string }[];
  contentSent?: { done?: boolean } | null;
  meetingLink?: string | null;
}

/** The concept's five mandatory readiness items, computed from the group's ACTIVE students. */
export function computeReadiness(group: ReadinessInput): Readiness {
  const students = (group.students ?? []).filter((s) => s.status !== GroupStudentStatus.WITHDRAWN);
  const items = [
    { key: ReadinessKey.TEACHER_ASSIGNED, done: group.teacherId != null },
    { key: ReadinessKey.MINIMUM_STUDENTS, done: students.length >= group.minStudents },
    { key: ReadinessKey.PAYMENTS_MADE, done: students.length > 0 && students.every((s) => s.paymentStatus === GroupPaymentStatus.PAID) },
    { key: ReadinessKey.CONTENT_SENT, done: group.contentSent?.done === true },
    { key: ReadinessKey.MEETING_LINK, done: typeof group.meetingLink === 'string' && group.meetingLink.trim().length > 0 },
  ];
  return { ready: items.every((item) => item.done), items };
}
