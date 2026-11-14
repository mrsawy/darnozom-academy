import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OptionalNonNull } from '../../common/optional-non-null';

export class CertificateRulesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAttendancePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minHomeworkAverage?: number;

  @IsOptional()
  @IsBoolean()
  requireExamPass?: boolean;

  @IsOptional()
  @IsBoolean()
  requireFullyPaid?: boolean;
}

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

  @IsOptional()
  @IsMongoId()
  ageRangeId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CertificateRulesDto)
  certificateRules?: CertificateRulesDto;
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

  /** Send null to clear the age range. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsMongoId()
  ageRangeId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CertificateRulesDto)
  certificateRules?: CertificateRulesDto;
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
