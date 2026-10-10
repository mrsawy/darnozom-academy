import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES } from '@lms-organization/shared-types';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { AiService } from './services/ai.service';
import { AiThreadService } from './services/ai-thread.service';
import { AiContextService } from './services/ai-context.service';
import { AiAttachmentService } from './services/ai-attachment.service';
import { AiControllerHttp } from './controllers/http/ai.controller.http';
import { AiControllerMessage } from './controllers/message/ai.controller.message';
import { AiThread, AiThreadSchema } from './entities/ai-thread.entity';
import { AiSubscriptionModule } from 'src/ai-subscription/ai-subscription.module';
import { CourseModule } from 'src/course/course.module';

@Module({
  imports: [
    AuthModule,
    RoleModule,
    MongooseModule.forFeature([{ name: AiThread.name, schema: AiThreadSchema }]),
    AiSubscriptionModule,
    CourseModule,
    MulterModule.register({ storage: memoryStorage(), limits: { fileSize: AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES } }),
  ],
  controllers: [AiControllerHttp, AiControllerMessage],
  providers: [AiService, AiThreadService, AiContextService, AiAttachmentService],
})
export class AiModule {}
