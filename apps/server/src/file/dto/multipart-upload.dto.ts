import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateMultipartUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsNumber()
  fileSize: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  /** Required when the uploader is a student (assignment submission). */
  @IsOptional()
  @IsMongoId()
  contentId?: string;

  /** Required when the uploader is a student (assignment submission). */
  @IsOptional()
  @IsMongoId()
  enrollmentId?: string;

  @IsOptional()
  @IsString()
  authorization?: string;
}

export class CompletedPartDto {
  @IsNumber()
  PartNumber: number;

  @IsString()
  @IsNotEmpty()
  ETag: string;
}

export class CompleteMultipartUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ValidateNested({ each: true })
  @Type(() => CompletedPartDto)
  parts: CompletedPartDto[];

  @IsOptional()
  @IsString()
  authorization?: string;
}

export class AbortMultipartUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @IsOptional()
  @IsString()
  authorization?: string;
}
