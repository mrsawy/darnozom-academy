'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { StudentCourseHistory } from '@/lib/types/attendance/attendance.types';

/**
 * Paginated per-session attendance history for one course.
 * Omit `studentId` for the logged-in student's own data (self-service).
 * Pass `studentId` to view another student's history — requires READ ATTENDANCE permission (staff).
 */
export async function getStudentCourseHistory(data: {
  courseId: string;
  from: string;
  to: string;
  page?: number;
  limit?: number;
  studentId?: string;
}): Promise<StudentCourseHistory | NatsErr> {
  if (data.studentId) {
    return createAuthorizedNatsRequest<StudentCourseHistory>(
      'attendance.getStudentCourseHistoryForStaff',
      {
        studentId: data.studentId,
        courseId: data.courseId,
        from: data.from,
        to: data.to,
        page: data.page,
        limit: data.limit,
      }
    );
  }

  return createAuthorizedNatsRequest<StudentCourseHistory>('attendance.getStudentCourseHistory', {
    courseId: data.courseId,
    from: data.from,
    to: data.to,
    page: data.page,
    limit: data.limit,
  });
}
