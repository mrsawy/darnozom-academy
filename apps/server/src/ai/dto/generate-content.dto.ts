import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AI_QUIZ_MAX_QUESTIONS, AI_QUIZ_MIN_QUESTIONS } from '@lms-organization/shared-types';

export class GenerateQuizDto {
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
}

export class GenerateArticleDto {
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
}

export interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
}
