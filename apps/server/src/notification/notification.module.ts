import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Notification, NotificationSchema } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationControllerMessage } from './notification.controller.message';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { CourseContent, CourseContentSchema } from 'src/course/entities/course-content.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { CourseContentPublishedListener } from './events/course-content-published.listener';
import { ContentNotificationProcessor } from './processors/content-notification.processor';
import { CONTENT_NOTIFICATION_QUEUE } from './queues/content-notification.queue';

import { EmailNotificationStrategy } from './strategies/email/email-notification.strategy';
import { SmsNotificationStrategy } from './strategies/sms/sms-notification.strategy';
import { WhatsappNotificationStrategy } from './strategies/whatsapp/whatsapp-notification.strategy';
import { InAppNotificationStrategy } from './strategies/in-app/in-app-notification.strategy';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { OrgReviewNotificationService } from './services/org-review-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    BullModule.registerQueue({ name: CONTENT_NOTIFICATION_QUEUE }),
    RealtimeModule,
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [NotificationControllerMessage],
  providers: [
    NotificationService,
    CourseContentPublishedListener,
    ContentNotificationProcessor,
    // Notification Strategies
    EmailNotificationStrategy,
    SmsNotificationStrategy,
    WhatsappNotificationStrategy,
    InAppNotificationStrategy,
    // Dispatcher & High-level notification services
    NotificationDispatcherService,
    OrgReviewNotificationService,
  ],
  exports: [
    NotificationService,
    NotificationDispatcherService,
    OrgReviewNotificationService,
    EmailNotificationStrategy,
    SmsNotificationStrategy,
    WhatsappNotificationStrategy,
    InAppNotificationStrategy,
  ],
})
export class NotificationModule {}

