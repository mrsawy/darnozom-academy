import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { AI_QUIZ_MAX_QUESTIONS, AI_QUIZ_MIN_QUESTIONS } from '@lms-organization/shared-types';

export class FileAttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  mimetype: string;

  @IsString()
  data: string; // base64-encoded file data
}

export class GenerateQuizNatsDto {
  @Type(() => Number)
  @IsInt()
  @Min(AI_QUIZ_MIN_QUESTIONS)
  @Max(AI_QUIZ_MAX_QUESTIONS)
  questionCount: number;

  @IsOptional()
  @IsMongoId()
  courseId?: string;

  @IsOptional()
  @IsMongoId()
  moduleId?: string;

  @IsOptional()
  @IsMongoId()
  contentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  prompt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileAttachmentDto)
  files?: FileAttachmentDto[];
}

export class GenerateArticleNatsDto {
  @IsOptional()
  @IsMongoId()
  courseId?: string;

  @IsOptional()
  @IsMongoId()
  moduleId?: string;

  @IsOptional()
  @IsMongoId()
  contentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  prompt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileAttachmentDto)
  files?: FileAttachmentDto[];
}
