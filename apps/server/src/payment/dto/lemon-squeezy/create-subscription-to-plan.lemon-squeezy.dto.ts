import { IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../../strategies/interfaces/payment-strategy.interface';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionType } from 'src/utils/enums/subscriptionType.enum';
import { BillingData, customerDto } from '../create-subscription.dto';
import type { ISubscribeToPlanLemonSqueezyPayload } from '../subscribe-to-plan.interface';

/**
 * Lemon Squeezy DTO for subscribe-to-plan.
 * Uses store + variant from env/plan; optional lemonSqueezyVariantId override.
 * @see https://docs.lemonsqueezy.com/api/checkouts/create-checkout
 */
export class CreateSubscriptionToPlanLemonSqueezyDto implements ISubscribeToPlanLemonSqueezyPayload {
  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType;

  @IsMongoId()
  planId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsMongoId()
  organizationId?: string;

  @ValidateNested()
  @Type(() => customerDto)
  customer: customerDto;

  @ValidateNested()
  @Type(() => BillingData)
  billing_data: BillingData;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider.LEMON_SQUEEZY;

  /** Override variant ID (from plan's lemonSqueezyVariantIds by default). */
  @IsOptional()
  @IsString()
  lemonSqueezyVariantId?: string;
}
