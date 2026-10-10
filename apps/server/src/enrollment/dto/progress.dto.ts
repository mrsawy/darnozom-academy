import { IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordContentAccessDto {
  @IsMongoId()
  enrollmentId: string;

  @IsMongoId()
  contentId: string;

  @IsOptional()
  @IsString()
  contentTitle?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoPositionSeconds?: number;
}

export class RecordTimeSpentDto {
  @IsMongoId()
  enrollmentId: string;

  @IsMongoId()
  contentId: string;

  @IsNumber()
  @Min(0)
  additionalMinutes: number;
}

export class UpdateVideoProgressDto {
  @IsMongoId()
  enrollmentId: string;

  @IsMongoId()
  contentId: string;

  @IsNumber()
  @Min(0)
  positionSeconds: number;
}

export class GetContentProgressDto {
  @IsMongoId()
  enrollmentId: string;

  @IsMongoId()
  contentId: string;
}
