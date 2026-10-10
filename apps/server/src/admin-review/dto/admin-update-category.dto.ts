import { IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CategoryUpdateDataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AdminUpdateCategoryDto {
  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CategoryUpdateDataDto)
  data: CategoryUpdateDataDto;
}
