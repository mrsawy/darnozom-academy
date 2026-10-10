import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PublishStatus } from '@lms-organization/shared-types';
import { ModuleContentSettingsDto } from './module-content-settings.dto';

export class CreateCourseModuleDto {
  @IsMongoId()
  @IsNotEmpty()
  courseId: string;

  @IsMongoId()
  @IsOptional()
  organizationId: string;

  @IsString()
  @IsOptional()
  createdBy: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  contentsIds?: string[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  learningObjectives?: string;

  @IsOptional()
  @IsString()
  authorization: string;

  @IsEnum(PublishStatus)
  @IsOptional()
  publishStatus?: PublishStatus;

  @ValidateNested()
  @Type(() => ModuleContentSettingsDto)
  @IsOptional()
  settings?: ModuleContentSettingsDto;
}
