import { DiscussionType } from '../enum/discussion-type.enum';

export const DISCUSSION_CREATED_EVENT = 'discussion.created';

export class DiscussionCreatedEvent {
  constructor(
    /** The newly created discussion id */
    public readonly discussionId: string,
    /** Who created it */
    public readonly authorId: string,
    /** The discussion type (course / module / content) */
    public readonly type: DiscussionType,
    public readonly courseId: string,
    public readonly moduleId: string | undefined,
    public readonly contentId: string | undefined,
    /** Set when this is a reply — the parent discussion's author should be notified */
    public readonly parentAuthorId: string | undefined,
    /** Id of the course instructor so they can be notified of top-level threads */
    public readonly courseInstructorId: string | undefined
  ) {}
}
