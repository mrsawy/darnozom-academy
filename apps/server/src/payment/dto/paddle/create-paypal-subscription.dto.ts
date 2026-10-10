import { IsString, IsNotEmpty, IsEmail, ValidateNested, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PayeePreferred, PayerSelected, ShippingPreference, UserAction } from 'src/payment/enums/paypal.enum';

export class ShippingAmountDto {
  @IsString()
  @IsNotEmpty()
  currency_code: string;

  @IsNotEmpty()
  value: string | number;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  address_line_1: string;

  @IsOptional()
  @IsString()
  address_line_2?: string;

  @IsString()
  @IsNotEmpty()
  admin_area_2: string;

  @IsString()
  @IsNotEmpty()
  admin_area_1: string;

  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @IsString()
  @IsNotEmpty()
  country_code: string;
}

export class ShippingAddressNameDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;
}

export class ShippingAddressDto {
  @ValidateNested()
  @Type(() => ShippingAddressNameDto)
  name: ShippingAddressNameDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

export class SubscriberNameDto {
  @IsString()
  @IsNotEmpty()
  given_name: string;

  @IsString()
  @IsNotEmpty()
  surname: string;
}

export class SubscriberDto {
  @ValidateNested()
  @Type(() => SubscriberNameDto)
  name: SubscriberNameDto;

  @IsEmail()
  email_address: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => ShippingAddressDto)
  shipping_address?: ShippingAddressDto;
}

export class PaymentMethodDto {
  @IsEnum(PayerSelected)
  payer_selected: PayerSelected;

  @IsEnum(PayeePreferred)
  payee_preferred: PayeePreferred;
}

export class ApplicationContextDto {
  @IsString()
  @IsNotEmpty()
  brand_name: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsOptional()
  @IsEnum(ShippingPreference)
  shipping_preference?: ShippingPreference;

  @IsOptional()
  @IsEnum(UserAction)
  user_action?: UserAction;

  @ValidateNested()
  @IsOptional()
  @Type(() => PaymentMethodDto)
  payment_method?: PaymentMethodDto;

  @IsString()
  @IsNotEmpty()
  return_url: string;

  @IsString()
  @IsNotEmpty()
  cancel_url: string;
}

export class CreatePaypalSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  plan_id: string;

  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ValidateNested()
  @Type(() => ShippingAmountDto)
  shipping_amount: ShippingAmountDto;

  @ValidateNested()
  @Type(() => SubscriberDto)
  subscriber: SubscriberDto;

  @ValidateNested()
  @Type(() => ApplicationContextDto)
  application_context: ApplicationContextDto;

  @IsOptional()
  @IsBoolean()
  auto_renewal?: boolean;

  // @IsEnum(SubscriptionType)
  // subscriptionType: SubscriptionType

  // @ValidateIf(o => o.subscriptionType === SubscriptionType.ORGANIZATION_PLAN)
  // @IsString()
  // planId: string;

  // @ValidateIf(o => o.subscriptionType === SubscriptionType.ORGANIZATION_PLAN)
  // @IsString()
  // organizationId: string;

  // @ValidateIf(o => o.subscriptionType === SubscriptionType.USER_COURSE)
  // @IsString()
  // userId: string;

  // @ValidateIf(o => o.subscriptionType === SubscriptionType.USER_COURSE)
  // @IsString()
  // courseId: string;
}
