import { IsNotEmpty, IsString, IsMongoId, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class MarkLiveSessionAttendanceDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  liveSessionId: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsDateString()
  leftAt?: string;

  @IsOptional()
  @IsBoolean()
  wasPresent?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsNotEmpty()
  @IsMongoId()
  enrollmentId: string;
}
