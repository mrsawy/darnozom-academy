import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './service/review.service';
import { ReviewControllerHttp } from './controllers/review.controller.http';
import { ReviewControllerMessage } from './controllers/review.controller.message';
import { Review, ReviewSchema } from './entities/review.entity';
import { CourseReviewSchema } from './entities/course-review.entity';
import { InstructorReviewSchema } from './entities/instructor-review.entity';
import { OrganizationReviewSchema } from './entities/organization-review.entity';
import { ModuleReviewSchema } from './entities/module-review.entity';
import { ContentReviewSchema } from './entities/content-review.entity';
import { ReviewType } from './enum/reviewType.enum';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { CourseModuleSchema } from 'src/course/entities/course-module.entity';
import { CourseContent, CourseContentSchema } from 'src/course/entities/course-content.entity';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Review.name,
        schema: ReviewSchema,
        discriminators: [
          { name: ReviewType.COURSE, schema: CourseReviewSchema },
          { name: ReviewType.INSTRUCTOR, schema: InstructorReviewSchema },
          { name: ReviewType.ORGANIZATION, schema: OrganizationReviewSchema },
          { name: ReviewType.MODULE, schema: ModuleReviewSchema },
          { name: ReviewType.CONTENT, schema: ContentReviewSchema },
        ],
      },
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Course.name, schema: CourseSchema },
      { name: 'CourseModule', schema: CourseModuleSchema },
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [ReviewControllerHttp, ReviewControllerMessage],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
