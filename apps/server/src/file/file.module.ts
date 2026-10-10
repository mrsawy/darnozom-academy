import { forwardRef, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileService } from './file.service';
import { ConfigService } from '@nestjs/config';
import { FileHttpController } from './file.controller.http';
import { AuthModule } from 'src/auth/auth.module';
import { FileMessageController } from './file.controller.message';
import { RoleModule } from 'src/role/role.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { MultipartUploadAccessService } from './multipart-upload-access.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: () => {
        return {
          storage: memoryStorage(),
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB max file size
          },
        };
      },
    }),
    forwardRef(() => AuthModule),
    RoleModule,
    SubscriptionModule,
  ],
  providers: [FileService, MultipartUploadAccessService],
  controllers: [FileHttpController, FileMessageController],
  exports: [MulterModule, FileService],
})
export class FileModule {}
