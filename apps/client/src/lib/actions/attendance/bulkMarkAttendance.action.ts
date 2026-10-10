'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { AttendanceStatus } from '@/lib/types/attendance/attendance.types';

export interface BulkAttendanceDto {
  courseId: string;
  slotId: string;
  date: Date;
  attendanceRecords: {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export async function bulkMarkAttendance(dto: BulkAttendanceDto) {
  return createAuthorizedNatsRequest('attendance.bulkMarkAttendance', {
    dto: {
      courseId: dto.courseId,
      slotId: dto.slotId,
      date: dto.date,
      students: dto.attendanceRecords,
    },
  });
}
