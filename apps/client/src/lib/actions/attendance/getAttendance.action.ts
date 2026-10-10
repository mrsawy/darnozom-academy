'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import {
  GetAttendanceByDateInput,
  Attendance,
  GetStudentAttendanceInput,
} from '@/lib/types/attendance/attendance.types';

export async function getAttendanceByDate(
  data: GetAttendanceByDateInput
): Promise<Attendance[] | NatsErr> {
  return createAuthorizedNatsRequest<Attendance[]>('attendance.getByCourse', {
    courseId: data.courseId,
    date: data.date,
  });
}

export async function getStudentAttendance(
  data: GetStudentAttendanceInput
): Promise<Attendance[] | NatsErr> {
  return createAuthorizedNatsRequest<Attendance[]>('attendance.getByStudent', {
    studentId: data.studentId,
    courseId: data.courseId,
  });
}
