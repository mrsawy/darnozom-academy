import { MeetingProvider } from '../../../configurations/course/enums/meeting-provider.enum';
import { CalendarAppointmentType } from './calender.type';

export interface ICalendarAppointmentMeta {
  bookingId?: string;
  sessionId?: string;
  instructorId?: string;
  startTime?: string;
  endTime?: string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  timezone?: string;
  status?: string;
  meetingUrl?: string;
  meetingLink?: string;
  provider?: MeetingProvider | string;
  agoraChannelName?: string;
  contentId?: string;
  enrollmentId?: string;
  slotId?: string;
  dayOfWeek?: string;
  maxPoints?: number;
  contentType?: string;
  description?: string;
  quizDurationInMinutes?: number;
  maxAttempts?: number;
  isGroupProject?: boolean;
  platform?: string;
}

export interface ICalendarAppointment {
  type: CalendarAppointmentType;
  title: string;
  courseId: string;
  courseName: string;
  /** Active enrollment used for deep-linking into My Learning / content. */
  enrollmentId?: string;
  /** Module the content belongs to, or the module tied to an offline attendance slot. */
  moduleId?: string;
  moduleName?: string;
  contentId?: string;
  date: string;
  endDate?: string;
  meta?: ICalendarAppointmentMeta;
}

export interface IStudentCalendarParams {
  fromDate?: string;
  toDate?: string;
}

export interface IStudentCalendarResponse {
  message: string;
  data: ICalendarAppointment[];
}
