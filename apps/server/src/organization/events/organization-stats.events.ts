export const COURSE_CREATED_EVENT = 'course.created';

export class CourseCreatedEvent {
  constructor(public readonly organizationId: string) {}
}
