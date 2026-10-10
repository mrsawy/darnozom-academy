import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminReviewActionDto {
  @IsMongoId()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsBoolean()
  @IsOptional()
  deleteFiles?: boolean;
}
