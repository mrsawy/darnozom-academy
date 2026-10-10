import { CourseContentType } from '../../course';

export enum CalendarAppointmentType {
  ASSIGNMENT = CourseContentType.ASSIGNMENT,
  QUIZ = CourseContentType.QUIZ,
  LIVE_SESSION = CourseContentType.LIVE_SESSION,
  PROJECT = CourseContentType.PROJECT,
  ATTENDANCE = 'ATTENDANCE',
  PRIVATE_SESSION = 'PRIVATE_SESSION',
}
