import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { Types } from 'mongoose';

export class CreatePageDto {
  @IsOptional()
  userId?: Types.ObjectId;

  @IsOptional()
  organizationId?: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsObject()
  @IsNotEmpty()
  pageData: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
