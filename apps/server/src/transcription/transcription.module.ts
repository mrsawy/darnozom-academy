import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseContent, CourseContentSchema } from 'src/course/entities/course-content.entity';
import { FileModule } from 'src/file/file.module';
import { TranscriptionService } from './transcription.service';
import { TranscriptionProcessor } from './processors/transcription.processor';
import { UploadedVideoStrategy } from './strategies/uploaded-video.strategy';
import { YoutubeStrategy } from './strategies/youtube.strategy';
import { AttachmentStrategy } from './strategies/attachment.strategy';
import { TranscriptExtractionService } from './services/transcript-extraction.service';
import { TRANSCRIPTION_QUEUE } from './transcription.types';

@Module({
  imports: [
    ConfigModule,
    FileModule,
    MongooseModule.forFeature([{ name: CourseContent.name, schema: CourseContentSchema }]),
    BullModule.registerQueue({ name: TRANSCRIPTION_QUEUE }),
  ],
  providers: [TranscriptionService, TranscriptionProcessor, UploadedVideoStrategy, YoutubeStrategy, AttachmentStrategy, TranscriptExtractionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
