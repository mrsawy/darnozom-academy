import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod, Currency } from '@darnozom/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { PaymentProvider } from 'src/payment/strategies/interfaces/payment-strategy.interface';

export class RenewEnrollmentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
