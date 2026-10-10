'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { MarkAttendanceInput, Attendance } from '@/lib/types/attendance/attendance.types';

export async function markAttendance(data: MarkAttendanceInput): Promise<Attendance | NatsErr> {
  return createAuthorizedNatsRequest<Attendance>('attendance.markAttendance', { dto: data });
}
