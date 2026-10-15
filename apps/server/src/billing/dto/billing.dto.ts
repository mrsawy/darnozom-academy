import { Type } from 'class-transformer';
import { ArrayMinSize, IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Currency, SubscriptionType } from '@darnozom/shared-types';

export class SubscriptionItemDto {
  @IsMongoId() studentId: string;
  @IsMongoId() groupId: string;
}

export class CreateSubscriptionPayload {
  @IsEnum(SubscriptionType) type: SubscriptionType;

  /** Integer minor units. 0 means a full scholarship. */
  @IsInt() @Min(0) amountMinor: number;

  @IsEnum(Currency) currency: Currency;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SubscriptionItemDto)
  items: SubscriptionItemDto[];

  @IsOptional() @IsString() note?: string;
}

export class CreateAdjustmentPayload {
  @IsMongoId() familyId: string;
  @IsInt() @Min(0) amountMinor: number;
  @IsIn([1, -1]) direction: 1 | -1;
  @IsEnum(Currency) currency: Currency;
  @IsString() @MinLength(1) reason: string;
  @IsOptional() @IsMongoId() studentId?: string;
  @IsOptional() @IsMongoId() groupId?: string;
}

export class FamilyIdPayload {
  @IsMongoId() familyId: string;
}

export class GroupIdPayload {
  @IsMongoId() groupId: string;
}

export class SubscriptionIdPayload {
  @IsMongoId() id: string;
}

export class InitiatePaymentPayload {
  @IsString() @MinLength(1) method: string;
  @IsInt() @Min(1) amountMinor: number;
  @IsEnum(Currency) currency: Currency;
}

export class AttachReceiptPayload {
  @IsMongoId() paymentId: string;
  @IsString() @MinLength(1) fileKey: string;
}

export class ReviewPaymentPayload {
  @IsMongoId() paymentId: string;
}

export class RejectPaymentPayload extends ReviewPaymentPayload {
  @IsString() @MinLength(1) reason: string;
}
