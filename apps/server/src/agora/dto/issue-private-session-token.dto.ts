import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class IssuePrivateSessionTokenDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  bookingId: string;
}
