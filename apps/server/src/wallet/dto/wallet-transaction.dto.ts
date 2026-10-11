// src/wallet/dto/wallet-transaction.dto.ts (update existing)
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Currency } from '@darnozom/shared-types';

export class WalletTransactionDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: Currency;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsOptional()
  metadata?: Record<string, string>;
}
