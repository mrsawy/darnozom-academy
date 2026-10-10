import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkAdminReviewActionDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  itemIds: string[];

  @IsString()
  @IsOptional()
  comment?: string;

  @IsBoolean()
  @IsOptional()
  deleteFiles?: boolean;
}
