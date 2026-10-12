import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsNotEmpty, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { OptionalNonNull } from '../../common/optional-non-null';

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
  @OptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @OptionalNonNull()
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
