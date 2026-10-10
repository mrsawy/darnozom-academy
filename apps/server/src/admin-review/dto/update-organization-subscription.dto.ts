import { IsMongoId, IsEnum, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';

export class UpdateOrganizationSubscriptionDto {
  @IsMongoId()
  orgId!: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endsAt?: Date | null;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  nextBillingAt?: Date | null;
}
