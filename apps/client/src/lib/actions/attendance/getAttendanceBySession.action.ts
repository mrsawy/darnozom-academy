'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { PaginatedSessionRoster } from '@/lib/types/attendance/attendance.types';

export async function getAttendanceBySession(data: {
  courseId: string;
  slotId: string;
  date: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedSessionRoster | NatsErr> {
  return createAuthorizedNatsRequest<PaginatedSessionRoster>('attendance.getBySession', {
    courseId: data.courseId,
    slotId: data.slotId,
    date: data.date,
    page: data.page,
    limit: data.limit,
    search: data.search,
  });
}
