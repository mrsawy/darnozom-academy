import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageTemplate, MessageTemplateSchema } from './entities/message-template.entity';
import { MessageTemplateService } from './services/message-template.service';
import { TemplateRenderService } from './services/template-render.service';
import { MessageTemplateControllerMessage } from './message-template.controller.message';
import { Group, GroupSchema } from 'src/academics/group/entities/group.entity';
import { Level, LevelSchema } from 'src/academics/level/entities/level.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageTemplate.name, schema: MessageTemplateSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Level.name, schema: LevelSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MessageTemplateControllerMessage],
  providers: [MessageTemplateService, TemplateRenderService],
})
export class MessageTemplateModule {}
