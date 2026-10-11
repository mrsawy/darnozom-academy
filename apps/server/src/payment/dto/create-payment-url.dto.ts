import { IsEnum, IsNumber, IsPositive, Min, Max, IsOptional, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency, PaymentMethod, PaymentProvider, PaymentPurpose } from '@darnozom/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';

export class CreatePaymentUrlDto {
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(1_000_000)
  @Transform(({ value }) => Number.parseFloat(String(value)))
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  courseId?: string;
}
