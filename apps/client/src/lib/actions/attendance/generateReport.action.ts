'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { AttendanceReportData } from '@/lib/types/attendance/attendance.types';

export interface AttendanceReportDto {
  courseId: string;
  startDate?: Date;
  endDate?: Date;
  studentId?: string;
}

export async function generateAttendanceReport(
  dto: AttendanceReportDto
): Promise<AttendanceReportData | NatsErr> {
  return createAuthorizedNatsRequest<AttendanceReportData>('attendance.generateReport', { dto });
}
