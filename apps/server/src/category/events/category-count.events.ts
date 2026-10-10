export const COURSE_CATEGORY_CHANGED_EVENT = 'course.category.changed';
export const INSTRUCTOR_CATEGORY_CHANGED_EVENT = 'instructor.category.changed';

export class CourseCategoryChangedEvent {
  constructor(
    public readonly addedCategoryIds: string[],
    public readonly removedCategoryIds: string[],
    public readonly instructorId?: string,
    public readonly previousInstructorId?: string
  ) {}
}

export class InstructorCategoryChangedEvent {
  constructor(
    public readonly addedCategoryIds: string[],
    public readonly removedCategoryIds: string[],
    public readonly instructorId: string
  ) {}
}
