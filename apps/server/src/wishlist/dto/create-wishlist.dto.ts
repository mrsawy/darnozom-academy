import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateWishlistDto {
  @IsMongoId()
  @IsNotEmpty()
  courseId: string;
}
