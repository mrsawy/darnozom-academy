'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import { StudentScheduledCourse } from '@/lib/types/attendance/attendance.types';

/** Courses the logged-in student is scheduled in (appears in an active offline slot roster). */
export async function getStudentScheduledCourses(): Promise<StudentScheduledCourse[] | NatsErr> {
  return createAuthorizedNatsRequest<StudentScheduledCourse[]>(
    'attendance.getStudentScheduledCourses',
    {}
  );
}
