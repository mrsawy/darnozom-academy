import { IsMongoId, IsString, IsEnum, IsOptional } from 'class-validator';
import { Currency, PaymentMethod, PaymentProvider } from '@lms-organization/shared-types';

export class BookSessionDto {
  @IsMongoId()
  sessionId: string;

  /** Subdocument _id of the chosen AvailableSlot */
  @IsString()
  slotId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsMongoId()
  @IsOptional()
  childId?: string;
}
