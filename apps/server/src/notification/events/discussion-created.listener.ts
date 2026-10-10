import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType, NotificationTextKey } from '@lms-organization/shared-types';
import { DISCUSSION_CREATED_EVENT, DiscussionCreatedEvent } from 'src/discussion/events/discussion-created.event';
import { NotificationService } from '../notification.service';
import { DiscussionType } from 'src/discussion/enum/discussion-type.enum';

@Injectable()
export class DiscussionCreatedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(DISCUSSION_CREATED_EVENT)
  async handleDiscussionCreated(event: DiscussionCreatedEvent): Promise<void> {
    // Used as an ICU `select` argument by discussionReplyBody/discussionNewBody — see Notifications i18n keys.
    const scope = event.type === DiscussionType.COURSE ? 'course' : event.type === DiscussionType.MODULE ? 'module' : 'content';

    if (event.parentAuthorId && event.parentAuthorId !== event.authorId) {
      await this.notificationService.create({
        userId: event.parentAuthorId,
        titleKey: NotificationTextKey.DISCUSSION_REPLY_TITLE,
        bodyKey: NotificationTextKey.DISCUSSION_REPLY_BODY,
        params: { scope },
        type: NotificationType.DISCUSSION,
        relatedId: event.discussionId,
      });
    }

    if (!event.parentAuthorId && event.courseInstructorId && event.courseInstructorId !== event.authorId) {
      await this.notificationService.create({
        userId: event.courseInstructorId,
        titleKey: NotificationTextKey.DISCUSSION_NEW_TITLE,
        bodyKey: NotificationTextKey.DISCUSSION_NEW_BODY,
        params: { scope },
        type: NotificationType.DISCUSSION,
        relatedId: event.discussionId,
      });
    }
  }
}
