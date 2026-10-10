export const COURSE_DELETED_EVENT = 'course.deleted';

export class CourseDeletedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly count: number
  ) {}
}
