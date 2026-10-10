'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';

export async function clearAttendance(data: {
  courseId: string;
  slotId: string;
  studentId: string;
  date: string;
}): Promise<void | NatsErr> {
  return createAuthorizedNatsRequest('attendance.clearAttendance', data);
}
