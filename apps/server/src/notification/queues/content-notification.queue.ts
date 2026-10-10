export const CONTENT_NOTIFICATION_QUEUE = 'content-notification';
export const NOTIFY_ENROLLED_STUDENTS_JOB = 'notify-enrolled-students';

export interface NotifyEnrolledStudentsJob {
  contentId: string;
  courseId: string;
  title: string;
  contentType: string;
}
