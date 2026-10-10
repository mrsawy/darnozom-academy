import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RefundRequestDto {
  @IsMongoId()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
