import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsMongoId, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  fileSizeBytes?: number;

  @IsOptional()
  @IsString()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  mimeType?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsNotEmpty()
  @IsMongoId()
  enrollmentId: string;

  @IsString()
  @IsOptional()
  studentName?: string;
}

export class GradeAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
