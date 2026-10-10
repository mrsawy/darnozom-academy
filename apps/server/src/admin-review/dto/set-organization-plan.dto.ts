import { IsMongoId, IsEnum, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';

export class SetOrganizationPlanDto {
  @IsMongoId()
  orgId!: string;

  @IsMongoId()
  planId!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endsAt?: Date | null;
}
