import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOptionDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: unknown;

  @IsString()
  @IsOptional()
  organizationId?: string; // for multi-tenant support
}
