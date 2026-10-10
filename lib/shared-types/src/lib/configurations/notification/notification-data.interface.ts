/** `data` payload on a `course_content` notification — what the client needs to route a click. */
export interface CourseContentNotificationData {
  courseId: string;
  contentId: string;
}
