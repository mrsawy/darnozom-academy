import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  parentId?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  authorization?: string;

  @IsOptional()
  organizationId?: string;
}
