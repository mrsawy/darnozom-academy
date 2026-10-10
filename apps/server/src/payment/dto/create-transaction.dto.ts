import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Currency } from '@lms-organization/shared-types';

export class CreateTransactionDto {
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.USD;

  @IsNotEmpty()
  client_info: {
    email: string;
    full_name: string;
    phone_number: string;
  };

  @IsOptional()
  reference_id?: string;

  @IsNumber()
  amount_cents: number;

  @IsNotEmpty()
  created_at: Date;
}
