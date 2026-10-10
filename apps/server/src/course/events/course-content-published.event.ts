import { ContentType } from '../enum/contentType.enum';

export const COURSE_CONTENT_PUBLISHED_EVENT = 'course.content.published';

/** Emitted once, the first time a course content item becomes visible to students (published + approved). */
export class CourseContentPublishedEvent {
  constructor(
    public readonly contentId: string,
    public readonly courseId: string,
    public readonly moduleId: string,
    public readonly organizationId: string,
    public readonly title: string,
    public readonly contentType: ContentType,
    /** User who created/published/approved the content, if known */
    public readonly actorId?: string
  ) {}
}
