import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { OptionalNonNull } from '../../common/optional-non-null';

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

export class UpdateProgramDto {
  @OptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

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

export class UpdateTrainingCoursePayload {
  @IsMongoId()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class CreateTrainingCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
