import { IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../../strategies/interfaces/payment-strategy.interface';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { SubscriptionType } from 'src/utils/enums/subscriptionType.enum';
import { BillingData, customerDto } from '../create-subscription.dto';
import type { ISubscribeToPlanPaddlePayload } from '../subscribe-to-plan.interface';

/**
 * Paddle DTO for subscribe-to-plan (payment.subscribe-to-plan).
 * Matches the payload sent from the client for Paddle subscription checkout.
 */
export class CreateSubscriptionToPlanPaddleDto implements ISubscribeToPlanPaddlePayload {
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
  provider: PaymentProvider.PADDLE;

  @IsOptional()
  @IsString()
  paddlePriceId?: string;

  @IsOptional()
  passthrough?: Record<string, unknown>;
}
