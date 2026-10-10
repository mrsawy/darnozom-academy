import { IsNotEmpty, IsMongoId, IsEnum, IsDate, IsOptional, IsObject, ValidateNested, IsString, IsNumber, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';

export class BillingInfoDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsMongoId()
  organizationId: string;

  @IsNotEmpty()
  @IsMongoId()
  planId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsDate()
  @Type(() => Date)
  startsAt: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endsAt?: Date | null;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  nextBillingAt?: Date | null;

  @IsOptional()
  @IsString()
  transactionId?: string | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BillingInfoDto)
  billing?: BillingInfoDto | null;

  @IsOptional()
  @IsNumber()
  reminderDays?: number;
}
