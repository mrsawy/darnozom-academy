import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionService } from '../services/subscription.service';
import { COURSE_DELETED_EVENT, CourseDeletedEvent } from './course-deleted.event';

@Injectable()
export class SubscriptionUsageListener {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @OnEvent(COURSE_DELETED_EVENT)
  async handleCourseDeleted(event: CourseDeletedEvent): Promise<void> {
    await this.subscriptionService.decrementUsage(event.organizationId, 'coursesUsed', event.count);
  }
}
