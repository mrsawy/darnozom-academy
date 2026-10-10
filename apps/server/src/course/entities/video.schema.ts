// src/course-content/schemas/video.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { VideoType } from '../enum/videoType.enum';
import { TranscriptSource, TranscriptStatus } from '../enum/transcriptStatus.enum';

@Schema({ _id: false })
export class TranscriptData {
  @Prop({ type: String, required: true })
  summary: string;

  @Prop({ type: [String], default: [] })
  keyPoints: string[];

  @Prop({ type: [String], default: [] })
  topics: string[];

  @Prop({ type: String, required: false })
  language?: string;
}

export const TranscriptDataSchema = SchemaFactory.createForClass(TranscriptData);

@Schema({ _id: false }) // _id is not needed as it will be part of the parent document
export class Video {
  @Prop({ type: String, required: true, enum: VideoType })
  videoType: VideoType;

  @Prop({
    required: function (this: Video) {
      return this.videoType === VideoType.URL;
    },
    type: String,
  })
  videoUrl: string;

  @Prop({
    type: String,
    required: function (this: Video) {
      return this.videoType === VideoType.UPLOAD;
    },
  })
  fileKey: string;

  /** File size in bytes for subscription storage usage. Set when videoType is UPLOAD. */
  @Prop({ type: Number, required: false })
  fileSizeBytes?: number;

  @Prop({ type: String, enum: TranscriptStatus, default: TranscriptStatus.PENDING, index: true })
  transcriptStatus: TranscriptStatus;

  @Prop({ type: String, required: false })
  transcript?: string;

  @Prop({ type: TranscriptDataSchema, required: false })
  transcriptData?: TranscriptData;

  @Prop({ type: String, enum: TranscriptSource, required: false })
  transcriptSource?: TranscriptSource;

  @Prop({ type: String, required: false })
  transcriptError?: string;

  @Prop({ type: Date, required: false })
  transcriptedAt?: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
