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
  providers: [NotificationService, CourseContentPublishedListener, ContentNotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
