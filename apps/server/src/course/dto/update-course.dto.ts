import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PublishStatus } from '@darnozom/shared-types';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @IsString()
  courseId: string;

  @IsEnum(PublishStatus)
  @IsOptional()
  publishStatus?: PublishStatus;
}
