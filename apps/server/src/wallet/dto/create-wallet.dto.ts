import { IsString, IsNumber, IsOptional, Min, IsMongoId } from 'class-validator';
import mongoose, { Types } from 'mongoose';

export class CreateWalletDto {
  @IsMongoId()
  @IsOptional()
  _id: mongoose.Types.ObjectId;

  @IsMongoId()
  userId: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  organizationId?: Types.ObjectId;

  @IsNumber()
  @Min(0)
  @IsOptional()
  balance?: number = 0;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsOptional()
  metadata?: Record<string, string>;
}
