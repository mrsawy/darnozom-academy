import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { NotificationModule } from 'src/notification/notification.module';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { Conversation, ConversationSchema } from './entities/conversation.entity';
import { ChatMessage, ChatMessageSchema } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatAccessService } from './chat-access.service';
import { ChatEmitService } from './chat-emit.service';
import { ChatControllerMessage } from './chat.controller.message';
import { ChatControllerHttp } from './chat.controller.http';
import { ChatGateway } from './chat.gateway';
import { RealtimeSessionAuthService } from 'src/realtime/realtime-session-auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
    RealtimeModule,
    NotificationModule,
  ],
  controllers: [ChatControllerMessage, ChatControllerHttp],
  providers: [ChatService, ChatAccessService, ChatEmitService, ChatGateway, RealtimeSessionAuthService],
  exports: [ChatService],
})
export class ChatModule {}
