import { IsString, IsOptional, ValidateNested, IsNotEmpty, IsEmail, IsInt, IsArray, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class customerDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// export class ExtrasDto {
//     @IsMongoId()
//     @IsNotEmpty()
//     planId: string;

//     @IsMongoId()
//     @IsNotEmpty()
//     organizationId: string;

//     @IsEnum(SubscriptionType)
//     @IsNotEmpty()
//     subscriptionType: SubscriptionType;
// }

export class BillingData {
  @IsOptional()
  @IsString()
  apartment: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  street: string;

  @IsString()
  @IsOptional()
  building?: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  floor?: string;

  // @IsString()
  // state: string;

  @IsString()
  @IsOptional()
  extra_description: string;

  @IsString()
  country_code: string;
}

export class SubscriptionItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  amount: number;
}

export class CreateSubscriptionDto {
  @IsInt()
  amount: number;

  @IsString()
  currency: string;

  @IsArray()
  @IsInt({ each: true })
  payment_methods: (number | string | { integration_id?: number; name?: string })[];

  @IsInt()
  subscription_plan_id: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionItemDto)
  items?: SubscriptionItemDto[];

  @ValidateNested()
  @Type(() => BillingData)
  billing_data: BillingData;

  @IsOptional()
  extras: unknown;
}

// create subscription dto for paymob
