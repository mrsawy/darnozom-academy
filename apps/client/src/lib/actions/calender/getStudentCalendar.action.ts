import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ICalendarAppointment, IStudentCalendarParams } from '@lms-organization/shared-types';

export async function getStudentCalendar(params?: IStudentCalendarParams) {
  return createAuthorizedNatsRequest<ICalendarAppointment[], IStudentCalendarParams>(
    'students.calendar',
    params ?? {}
  );
}
