import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscussionService } from './discussion.service';
import { DiscussionControllerHttp } from './discussion.controller.http';
import { DiscussionControllerMessage } from './discussion.controller.message';
import { Discussion, DiscussionSchema } from './entities/discussion.entity';
import { CourseDiscussion, CourseDiscussionSchema } from './entities/course-discussion.entity';
import { ModuleDiscussion, ModuleDiscussionSchema } from './entities/module-discussion.entity';
import { ContentDiscussion, ContentDiscussionSchema } from './entities/content-discussion.entity';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [
    forwardRef(() => CourseModule),
    AuthModule,
    RoleModule,
    MongooseModule.forFeatureAsync([
      {
        name: Discussion.name,
        useFactory: () => {
          const schema = DiscussionSchema;
          return schema;
        },
        discriminators: [
          { name: CourseDiscussion.name, schema: CourseDiscussionSchema },
          { name: ModuleDiscussion.name, schema: ModuleDiscussionSchema },
          { name: ContentDiscussion.name, schema: ContentDiscussionSchema },
        ],
      },
    ]),
  ],
  controllers: [DiscussionControllerHttp, DiscussionControllerMessage],
  providers: [DiscussionService],
  exports: [DiscussionService],
})
export class DiscussionModule {}
