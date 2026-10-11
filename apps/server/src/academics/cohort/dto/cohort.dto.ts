import { Type } from 'class-transformer';
import { IsDateString, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
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
