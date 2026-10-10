import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { COURSE_CONTENT_PUBLISHED_EVENT, CourseContentPublishedEvent } from 'src/course/events/course-content-published.event';
import { CONTENT_NOTIFICATION_QUEUE, NOTIFY_ENROLLED_STUDENTS_JOB, NotifyEnrolledStudentsJob } from '../queues/content-notification.queue';

@Injectable()
export class CourseContentPublishedListener {
  private readonly logger = new Logger(CourseContentPublishedListener.name);

  constructor(@InjectQueue(CONTENT_NOTIFICATION_QUEUE) private readonly queue: Queue<NotifyEnrolledStudentsJob>) {}

  @OnEvent(COURSE_CONTENT_PUBLISHED_EVENT)
  async handleCourseContentPublished(event: CourseContentPublishedEvent): Promise<void> {
    try {
      await this.queue.add(
        NOTIFY_ENROLLED_STUDENTS_JOB,
        { contentId: event.contentId, courseId: event.courseId, title: event.title, contentType: event.contentType },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: `notify-content-${event.contentId}`,
          removeOnComplete: 100,
          removeOnFail: 200,
        }
      );
    } catch (err) {
      this.logger.error(`Failed to enqueue content notification for ${event.contentId}`, err);
    }
  }
}
