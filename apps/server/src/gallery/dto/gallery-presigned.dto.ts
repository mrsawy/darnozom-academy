import { IsString, IsNumber, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class GalleryPresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
