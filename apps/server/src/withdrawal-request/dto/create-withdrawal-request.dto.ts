import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { WithdrawalMethod } from '@darnozom/shared-types';

export class MobileWalletDetailsDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  providerName: string;
}

export class BankTransferDetailsDto {
  @IsString()
  @IsNotEmpty()
  iban: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountHolderName: string;
}

export class CreditCardDetailsDto {
  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @IsString()
  @IsNotEmpty()
  cardLastFour: string;
}

export class CreateWithdrawalRequestDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsEnum(WithdrawalMethod)
  method: WithdrawalMethod;

  @IsObject()
  methodDetails: MobileWalletDetailsDto | BankTransferDetailsDto | CreditCardDetailsDto;

  @IsString()
  @IsOptional()
  userNote?: string;
}
