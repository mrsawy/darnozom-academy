import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { SESSION_SCORE_MAX, SESSION_SCORE_MIN } from '@darnozom/shared-types';

export class SupervisionNotesDto {
  @IsOptional() @IsString() commitment?: string;
  @IsOptional() @IsString() teaching?: string;
  @IsOptional() @IsString() pedagogy?: string;
  @IsOptional() @IsString() contentAdherence?: string;
  @IsOptional() @IsString() technicalQuality?: string;
  @IsOptional() @IsString() general?: string;
}

export class SupervisionScoresDto {
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) commitment: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) teaching: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) pedagogy: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) contentAdherence: number;
  @IsInt() @Min(SESSION_SCORE_MIN) @Max(SESSION_SCORE_MAX) technicalQuality: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SupervisionNotesDto)
  notes?: SupervisionNotesDto;
}

export class CreateEvaluationPayload extends SupervisionScoresDto {
  @IsMongoId()
  sessionId: string;
}

export class UpdateEvaluationPayload {
  @IsMongoId()
  id: string;

  @ValidateNested()
  @Type(() => SupervisionScoresDto)
  data: SupervisionScoresDto;
}

export class FindEvaluationsPayload {
  @IsOptional() @IsMongoId() groupId?: string;
  @IsOptional() @IsMongoId() teacherId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
