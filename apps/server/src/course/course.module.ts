import { forwardRef, Module } from '@nestjs/common';
import { CourseService } from './services/course/course.service';
import { CourseFeaturedService } from './services/course/course-featured.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from './entities/course.entity';
import { CourseContent, CourseContentSchema } from './entities/course-content.entity';
import { ContentVersion, ContentVersionSchema } from './entities/content-version.entity';
import { ContentType } from './enum/contentType.enum';
import { VideoSchema } from './entities/video.schema';
import { ArticleSchema } from './entities/article.schema';
import { QuizSchema } from './entities/quiz.schema';
import { AssignmentSchema } from './entities/assignment.schema';
import { ProjectSchema } from './entities/project.schema';
import { LiveSessionSchema } from './entities/liveSession.schema';
import { AttachmentSchema } from './entities/attachment.schema';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { UserModule } from 'src/user/user.module';
import { CourseContentService } from './services/content/course-content.service';
import { CourseContentQueryService } from './services/content/course-content-query.service';
import { CourseContentStorageService } from './services/content/course-content-storage.service';
import { CourseContentNotificationService } from './services/content/notification/course-content-notification.service';
import { FileModule } from 'src/file/file.module';
import { CurrencyModule } from 'src/currency/currency.module';
import { CourseModulesService } from './services/module/course-modules.service';
import { CourseModuleSchema } from './entities/course-module.entity';
import { CategoryModule } from 'src/category/category.module';
import { ContentControllerMessage } from './controller/message/content.controller.message';
import { QuizService } from './services/content/quiz/quiz.service';
import { QuizSubmissionsReadService } from './services/content/quiz/quiz-submissions-read.service';
import { ProjectService } from './services/content/project/project.service';
import { LiveSessionService } from './services/content/live-session/live-session.service';

import { CourseControllerMessage } from './controller/message/course.controller.message';
import { ModuleControllerMessage } from './controller/message/module.controller.message';
import { CourseControllerHttp } from './controller/http/course.controller.http';
import { ContentControllerHttp } from './controller/http/content.controller.http';
import { ModuleControllerHttp } from './controller/http/module.controller.http';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { Category, CategorySchema } from 'src/category/entities/category.entity';
import { Grade, GradeSchema } from 'src/grade/entities/grade.entity';
import { SchoolType, SchoolTypeSchema } from 'src/school-type/entities/school-type.entity';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { AssignmentService } from './services/content/assignment/assignment.service';
import { EnrollmentModule } from 'src/enrollment/enrollment.module';
import { TranscriptionModule } from 'src/transcription/transcription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: 'CourseModule', schema: CourseModuleSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Grade.name, schema: GradeSchema },
      { name: SchoolType.name, schema: SchoolTypeSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: ContentVersion.name, schema: ContentVersionSchema },
      {
        name: CourseContent.name,
        schema: CourseContentSchema,
        discriminators: [
          { name: ContentType.VIDEO, schema: VideoSchema },
          { name: ContentType.ARTICLE, schema: ArticleSchema },
          { name: ContentType.QUIZ, schema: QuizSchema },
          { name: ContentType.ASSIGNMENT, schema: AssignmentSchema },
          { name: ContentType.PROJECT, schema: ProjectSchema },
          { name: ContentType.LIVE_SESSION, schema: LiveSessionSchema },
          { name: ContentType.ATTACHMENT, schema: AttachmentSchema },
        ],
      },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
    forwardRef(() => UserModule),
    FileModule,
    CurrencyModule,
    forwardRef(() => EnrollmentModule),
    CategoryModule,
    SubscriptionModule,
    TranscriptionModule,
  ],
  controllers: [
    CourseControllerHttp,
    ContentControllerHttp,
    ModuleControllerHttp,
    CourseControllerMessage,
    ContentControllerMessage,
    ModuleControllerMessage,
  ],
  providers: [
    CourseService,
    CourseFeaturedService,
    CourseContentService,
    CourseContentQueryService,
    CourseContentStorageService,
    CourseContentNotificationService,
    CourseModulesService,
    QuizService,
    QuizSubmissionsReadService,
    ProjectService,
    LiveSessionService,
    AssignmentService,
  ],
  exports: [
    MongooseModule,
    CourseService,
    CourseContentService,
    CourseContentQueryService,
    CourseContentNotificationService,
    CourseModulesService,
    QuizService,
    QuizSubmissionsReadService,
    ProjectService,
    LiveSessionService,
    AssignmentService,
  ],
})
export class CourseModule {}
