import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaymentMethod, Currency } from '@lms-organization/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { PaymentProvider } from 'src/payment/strategies/interfaces/payment-strategy.interface';

export class CreateEnrollmentHttpDto {
  @IsMongoId()
  courseId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle: BillingCycle = BillingCycle.ONE_TIME;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsEnum(Currency)
  currency: Currency;
}
