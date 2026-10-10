import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, ValidateNested } from 'class-validator';
import { CreateSubscriptionPlanDto } from './create-subscription-plan.dto';
import { BillingData, customerDto } from './create-subscription.dto';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';

/**
 * DTO for initiating an organization plan subscription (payment flow).
 * Used by payment controllers and strategies when creating a subscription payment URL for a plan.
 */
export class CreatePlanSubscriptionDto extends CreateSubscriptionPlanDto {
  @IsMongoId()
  organizationId: string;

  @IsMongoId()
  planId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ValidateNested()
  @Type(() => customerDto)
  customer: customerDto;

  @ValidateNested()
  @Type(() => BillingData)
  billing_data: BillingData;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
