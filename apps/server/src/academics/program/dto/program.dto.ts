import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

export class UpdateProgramPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateProgramDto)
  data!: UpdateProgramDto;
}

export class LinkCoursePayload {
  @IsMongoId()
  programId!: string;

  @IsMongoId()
  courseId!: string;
}

export class CourseIdPayload {
  @IsMongoId()
  courseId!: string;
}
