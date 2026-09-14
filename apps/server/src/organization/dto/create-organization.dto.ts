import { IsString, IsNotEmpty, IsOptional, IsMongoId, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import mongoose from 'mongoose';

export class BrandingDto {
  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;
}

export class SettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;
}

export class CreateOrganizationDto {
  @IsMongoId()
  @IsOptional()
  _id?: mongoose.Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsMongoId()
  superAdminId?: mongoose.Types.ObjectId;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SettingsDto)
  settings?: SettingsDto;
}
