import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsEnum,
  ValidateIf,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { ModuleContentSettingsDto } from './module-content-settings.dto';
import { ContentType } from '../enum/contentType.enum';
import { VideoType } from '../enum/videoType.enum';
import { Type } from 'class-transformer';
import { MeetingProvider, Platform, PublishStatus } from '@darnozom/shared-types';
import { IsWithinAttachmentSizeLimit } from './validators/is-within-attachment-size-limit.validator';
import { IsValidCorrectOption } from './validators/is-valid-correct-option.validator';

export class CreateCourseContentDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'Course ID must be a valid MongoDB ObjectId' })
  courseId: string;

  @IsNotEmpty()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  moduleId: string;

  @IsOptional()
  organizationId: string;

  @IsOptional()
  createdBy: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(ContentType)
  type: ContentType;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.VIDEO)
  @IsNotEmpty()
  @IsEnum(VideoType)
  videoType?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.VIDEO && o.videoType === VideoType.URL)
  @IsNotEmpty()
  @IsString()
  videoUrl?: string;

  @ValidateIf(
    (o: CreateCourseContentDto) =>
      (o.type === ContentType.VIDEO && o.videoType === VideoType.UPLOAD) || o.type === ContentType.ASSIGNMENT || o.type === ContentType.ATTACHMENT
  )
  @IsNotEmpty()
  @IsString()
  fileKey?: string;

  /** File size in bytes. Required when content has an uploaded file (VIDEO UPLOAD or ASSIGNMENT PDF). Used for subscription storage quota. */
  @ValidateIf(
    (o: CreateCourseContentDto) =>
      (o.type === ContentType.VIDEO && o.videoType === VideoType.UPLOAD) ||
      (o.type === ContentType.ASSIGNMENT && !!o.fileKey) ||
      o.type === ContentType.ATTACHMENT
  )
  @IsNotEmpty({ message: 'File size is required when content includes an uploaded file' })
  @IsNumber()
  @Min(1, { message: 'File size must be at least 1 byte' })
  @IsWithinAttachmentSizeLimit(31_457_280)
  fileSizeBytes?: number;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.ATTACHMENT)
  @IsNotEmpty({ message: 'mimeType is required for attachment content' })
  @IsIn([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ])
  mimeType?: string;

  // Article-specific properties (only validated when type is ARTICLE)
  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.ARTICLE)
  @IsNotEmpty({ message: 'Body is required for article content' })
  @IsString()
  body?: string;

  // Assignment and Project shared properties
  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.ASSIGNMENT || o.type === ContentType.PROJECT)
  @IsNotEmpty({ message: 'Due date is required' })
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: Date;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.ASSIGNMENT || o.type === ContentType.PROJECT)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Max points must be at least 1' })
  @Max(1000, { message: 'Max points cannot exceed 1000' })
  maxPoints?: number = 100;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.ASSIGNMENT || o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  authorization?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.QUIZ)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Question)
  @IsNotEmpty()
  questions?: Question[];

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.QUIZ)
  @IsDateString()
  @IsNotEmpty()
  quizStartDate?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.QUIZ)
  @IsDateString()
  @IsNotEmpty()
  quizEndDate?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.QUIZ)
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  quizDurationInMinutes?: number;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.QUIZ)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Max attempts must be at least 1' })
  maxAttempts?: number;

  // Project-specific properties (only validated when type is PROJECT)
  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.PROJECT)
  @IsNotEmpty({ message: 'Requirements are required for project content' })
  @IsString()
  requirements?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.PROJECT)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.PROJECT)
  @IsOptional()
  @IsString()
  isGroupProject?: boolean;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.PROJECT)
  @IsOptional()
  @IsNumber()
  @Min(2, { message: 'Max group size must be at least 2' })
  maxGroupSize?: number;

  // Live Session-specific properties (only validated when type is LIVE_SESSION)
  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsNotEmpty({ message: 'Start date is required for live session content' })
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: Date;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsNotEmpty({ message: 'End date is required for live session content' })
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: Date;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @IsEnum(MeetingProvider)
  provider?: MeetingProvider;

  /** Required only when provider is EXTERNAL_URL (default). */
  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION && (o.provider === MeetingProvider.EXTERNAL_URL || !o.provider))
  @IsNotEmpty({ message: 'Meeting URL is required for external-URL live sessions' })
  @IsString()
  meetingUrl?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @IsString()
  meetingPassword?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION && o.provider === MeetingProvider.EXTERNAL_URL)
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @IsString()
  recordedSession?: string;

  @ValidateIf((o: CreateCourseContentDto) => o.type === ContentType.LIVE_SESSION)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Duration must be non-negative' })
  durationInMinutes?: number;

  @IsEnum(PublishStatus)
  @IsOptional()
  publishStatus?: PublishStatus;

  @ValidateNested()
  @Type(() => ModuleContentSettingsDto)
  @IsOptional()
  settings?: ModuleContentSettingsDto;
}

class Question {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @IsValidCorrectOption()
  correctOption: number;

  @IsNotEmpty()
  @IsString()
  questionText: string;
}
