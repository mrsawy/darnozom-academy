import { IsString, IsEmail, IsNumber, IsEnum, IsDate, IsOptional, IsObject, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';

class BillingDto {
  @IsEmail()
  email: string;

  @IsString()
  last_name: string;

  @IsString()
  first_name: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class SubscriptionDto {
  @IsNumber()
  reminder_days: number;

  @IsString()
  state: string;

  @IsDate()
  @Type(() => Date)
  starts_at: Date;

  @IsDate()
  @Type(() => Date)
  next_billing: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  reminder_date: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  ends_at: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resumed_at?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  suspended_at?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reactivated_at?: Date;

  @IsNotEmpty()
  transaction_id: string | number;

  @IsObject()
  @ValidateNested()
  @Type(() => BillingDto)
  billing: BillingDto;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}
