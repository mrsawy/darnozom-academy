import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateBulkWishlistDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  courseIds: string[];
}
