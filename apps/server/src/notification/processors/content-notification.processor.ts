import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';
import { AccessType, NotificationType, NotificationTextKey, RealtimeEvents } from '@lms-organization/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { isContentServableToStudent } from 'src/course/utils/content-access.util';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { RealtimeService } from 'src/realtime/realtime.service';
import { NotificationService } from '../notification.service';
import { CONTENT_NOTIFICATION_QUEUE, NOTIFY_ENROLLED_STUDENTS_JOB, NotifyEnrolledStudentsJob } from '../queues/content-notification.queue';

const BATCH_SIZE = 500;

@Processor(CONTENT_NOTIFICATION_QUEUE, { concurrency: 2 })
export class ContentNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentNotificationProcessor.name);

  constructor(
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(CourseContent.name) private readonly courseContentModel: Model<CourseContent>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    private readonly notificationService: NotificationService,
    private readonly realtimeService: RealtimeService
  ) {
    super();
  }

  async process(job: Job<NotifyEnrolledStudentsJob>): Promise<void> {
    if (job.name !== NOTIFY_ENROLLED_STUDENTS_JOB) return;
    const { contentId, courseId, title } = job.data;

    // Re-check visibility: the content may have been hidden/deleted between emit and processing.
    const content = await this.courseContentModel.findById(contentId).select('publishStatus approvalStatus activeStatus deletedAt').lean();
    if (!content || !isContentServableToStudent(content)) {
      this.logger.log(`Content ${contentId} is no longer visible to students; skipping notifications.`);
      return;
    }

    const course = await this.courseModel.findById(courseId).select('name').lean();
    const courseName = course?.name ?? 'your course';

    // Same access rule as the content gate (EnrollmentService.assertActiveEnrollmentForCourse):
    // an enrollment exists (soft-deleted ones are excluded by the schema middleware) and a
    // subscription-type enrollment has not passed its end date.
    // `courseId` is a Mixed path on the Enrollment schema (no auto-cast), so it must be an ObjectId here.
    const accessFilter = {
      courseId: new Types.ObjectId(courseId),
      $nor: [{ accessType: AccessType.SUBSCRIPTION, 'subscription.ends_at': { $lt: new Date() } }],
    };

    let batch: string[] = [];
    let notified = 0;
    for await (const enrollment of this.enrollmentModel.find(accessFilter).select('userId').lean().cursor()) {
      batch.push(enrollment.userId.toString());
      if (batch.length >= BATCH_SIZE) {
        notified += await this.notifyBatch(batch, contentId, courseId, courseName, title);
        batch = [];
      }
    }
    notified += await this.notifyBatch(batch, contentId, courseId, courseName, title);

    this.logger.log(`Notified ${notified} students of new content ${contentId} in course ${courseId}`);
  }

  private async notifyBatch(userIds: string[], contentId: string, courseId: string, courseName: string, contentTitle: string): Promise<number> {
    if (userIds.length === 0) return 0;

    // A job retry after a partial run must not notify the same student twice.
    const already = await this.notificationService.findAlreadyNotifiedUserIds(userIds, NotificationType.COURSE_CONTENT, contentId);
    const targets = [...new Set(userIds)].filter((id) => !already.has(id));
    if (targets.length === 0) return 0;

    const created = await this.notificationService.createMany(
      targets.map((userId) => ({
        userId,
        titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
        bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
        params: { contentTitle, courseName },
        data: { courseId, contentId },
        type: NotificationType.COURSE_CONTENT,
        relatedId: contentId,
        relatedModel: 'CourseContent' as const,
      }))
    );

    await Promise.allSettled(
      created.map((n) => this.realtimeService.emitToUser(n.userId.toString(), RealtimeEvents.NOTIFICATION_COURSE_CONTENT_CREATED, n))
    );
    return created.length;
  }
}
