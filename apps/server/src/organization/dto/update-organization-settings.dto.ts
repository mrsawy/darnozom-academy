import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  logoFileKey?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'primaryColor must be a 6-digit hex color like #9a5b2e' })
  primaryColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'secondaryColor must be a 6-digit hex color like #efdfcb' })
  secondaryColor?: string;

  /** 'default', 'custom', or a preset id (e.g. 'violet-bloom'). */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,40}$/, { message: 'themeId must be lowercase letters, numbers and dashes' })
  themeId?: string;
}
