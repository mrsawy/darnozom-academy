import { IsNotEmpty, IsString, IsMongoId, IsOptional, IsArray } from 'class-validator';

export class SubmitProjectDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsString()
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  liveDemoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  groupMembers?: string[];

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsNotEmpty()
  @IsMongoId()
  enrollmentId: string;
}
