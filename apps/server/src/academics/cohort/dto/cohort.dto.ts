import { Type } from 'class-transformer';
import { IsDateString, IsMongoId, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { OptionalNonNull } from '../../common/optional-non-null';

export class CreateCohortDto {
  @IsMongoId()
  levelId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /** ISO date, e.g. "2026-10-20" */
  @IsDateString()
  startDate!: string;
}

export class UpdateCohortDto {
  @OptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @OptionalNonNull()
  @IsDateString()
  startDate?: string;
}

export class UpdateCohortPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateCohortDto)
  data!: UpdateCohortDto;
}

export class FindCohortsPayload {
  @IsMongoId()
  levelId!: string;
}
