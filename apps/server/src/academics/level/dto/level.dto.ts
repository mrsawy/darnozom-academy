import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateLevelDto {
  @IsMongoId()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateLevelPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateLevelDto)
  data!: UpdateLevelDto;
}

export class FindLevelsPayload {
  @IsMongoId()
  courseId!: string;
}
