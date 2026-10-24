import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/category/entities/category.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { CourseModuleSchema } from 'src/course/entities/course-module.entity';
import { CourseContent, CourseContentSchema } from 'src/course/entities/course-content.entity';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { AuthModule } from 'src/auth/auth.module';
import { FileModule } from 'src/file/file.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { CourseModule } from 'src/course/course.module';
import { EnrollmentModule } from 'src/enrollment/enrollment.module';
import { UserModule } from 'src/user/user.module';
import { AdminReviewSupport } from './services/admin-review.support';
import { AdminReviewStatsService } from './services/admin-review-stats.service';
import { AdminReviewCategoryService } from './services/admin-review-category.service';
import { AdminReviewCourseService } from './services/admin-review-course.service';
import { AdminReviewModuleService } from './services/admin-review-module.service';
import { AdminReviewContentService } from './services/admin-review-content.service';
import { AdminReviewOrganizationService } from './services/admin-review-organization.service';
import { AdminReviewVerificationService } from './services/admin-review-verification.service';
import { AdminReviewSuspendService } from './services/admin-review-suspend.service';
import { AdminReviewControllerMessage } from './controllers/message/admin-review.controller.message';
import { RoleModule } from 'src/role/role.module';

import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Course.name, schema: CourseSchema },
      { name: 'CourseModule', schema: CourseModuleSchema },
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    AuthModule,
    FileModule,
    SubscriptionModule,
    RoleModule,
    NotificationModule,
    forwardRef(() => CourseModule),
    forwardRef(() => EnrollmentModule),
    forwardRef(() => UserModule),
  ],
  controllers: [AdminReviewControllerMessage],
  providers: [
    AdminReviewSupport,
    AdminReviewStatsService,
    AdminReviewCategoryService,
    AdminReviewCourseService,
    AdminReviewModuleService,
    AdminReviewContentService,
    AdminReviewOrganizationService,
    AdminReviewVerificationService,
    AdminReviewSuspendService,
  ],
})
export class AdminReviewModule {}
