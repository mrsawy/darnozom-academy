import { IsBoolean, IsEnum, IsInt, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../../strategies/interfaces/payment-strategy.interface';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionType } from 'src/utils/enums/subscriptionType.enum';
import { BillingData, customerDto } from '../create-subscription.dto';
import type { ISubscribeToPlanPaymobPayload } from '../subscribe-to-plan.interface';

/**
 * Paymob DTO for subscribe-to-plan (payment.subscribe-to-plan).
 * Matches the payload sent from the client for Paymob subscription checkout.
 */
export class CreateSubscriptionToPlanPaymobDto implements ISubscribeToPlanPaymobPayload {
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
  provider: PaymentProvider.PAYMOB;

  @IsInt()
  @Type(() => Number)
  frequency: number;

  @IsString()
  plan_type: 'rent';

  @IsBoolean()
  use_transaction_amount: boolean;

  constructor(partial?: Partial<CreateSubscriptionToPlanPaymobDto>) {
    Object.assign(this, partial);
    this.plan_type ??= 'rent';
    this.use_transaction_amount ??= true;
  }
}
