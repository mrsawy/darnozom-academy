import { IsOptional, IsEnum, IsDate, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { BillingInfoDto } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

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
  @IsDate()
  @Type(() => Date)
  cancelledAt?: Date | null;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  suspendedAt?: Date | null;
}
