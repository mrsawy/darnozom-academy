import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginateModel } from 'mongoose';
import { ActiveStatus, PublishStatus } from '@lms-organization/shared-types';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';
import { CourseContent } from '../../../entities/course-content.entity';
import { NOT_DELETED_CONTENT_FILTER } from '../../../utils/not-deleted-content.filter';
import { COURSE_CONTENT_PUBLISHED_EVENT, CourseContentPublishedEvent } from '../../../events/course-content-published.event';

@Injectable()
export class CourseContentNotificationService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: PaginateModel<CourseContent>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Emits COURSE_CONTENT_PUBLISHED_EVENT the first time a content item is visible to students
   * (published + approved + active, not deleted). The `studentsNotifiedAt` claim is atomic, so calling this
   * repeatedly (create, update, admin approval) never produces duplicate notifications.
   */
  async notifyStudentsIfVisible(contentId: string, actorId?: string): Promise<void> {
    const claimed = await this.courseContentModel.findOneAndUpdate(
      {
        _id: contentId,
        publishStatus: PublishStatus.PUBLISHED,
        approvalStatus: { $in: APPROVED_STATUSES },
        activeStatus: ActiveStatus.ACTIVE,
        studentsNotifiedAt: null,
        ...NOT_DELETED_CONTENT_FILTER,
      },
      { $set: { studentsNotifiedAt: new Date() } },
      { new: true }
    );
    if (!claimed) return;

    this.eventEmitter.emit(
      COURSE_CONTENT_PUBLISHED_EVENT,
      new CourseContentPublishedEvent(
        claimed._id.toString(),
        claimed.courseId.toString(),
        claimed.moduleId.toString(),
        claimed.organizationId.toString(),
        claimed.title,
        claimed.type,
        actorId
      )
    );
  }
}
