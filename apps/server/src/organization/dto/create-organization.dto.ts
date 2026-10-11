import {
  IsString,
  IsEmail,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsUrl,
  IsNotEmpty,
  IsMongoId,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';
import mongoose from 'mongoose';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { IDENTIFIER_PATTERN } from '@darnozom/shared-types';

class BillingDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class SubscriptionDto {
  @IsOptional()
  @IsNumber()
  reminder_days?: number;

  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsDateString()
  starts_at: string;

  @IsOptional()
  // @IsDateString()
  next_billing?: string;

  @IsOptional()
  @IsDateString()
  reminder_date?: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;

  @IsOptional()
  @IsDateString()
  resumed_at?: string;

  @IsOptional()
  @IsDateString()
  suspended_at?: string;

  @IsOptional()
  @IsDateString()
  reactivated_at?: string;

  @IsString()
  @IsOptional()
  transaction_id?: string;

  @ValidateNested()
  @Type(() => BillingDto)
  billing: BillingDto;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
export class BrandingDto {
  @IsUrl()
  logo: string;

  @IsString()
  primaryColor: string;

  @IsString()
  secondaryColor: string;
}

// export class FeaturesDto {
//     @IsInt()
//     maxUsers: number;

//     @IsInt()
//     maxCourses: number;

//     @IsBoolean()
//     certificatesEnabled: boolean;

//     @IsBoolean()
//     advancedAnalytics: boolean;
// }

// export class NotificationsDto {
//     @IsBoolean()
//     emailEnabled: boolean;

//     @IsBoolean()
//     smsEnabled: boolean;
// }

export class SettingsDto {
  @ValidateNested()
  @Type(() => BrandingDto)
  branding: BrandingDto;

  // @ValidateNested()
  // @Type(() => FeaturesDto)
  // features: FeaturesDto;

  // @ValidateNested()
  // @Type(() => NotificationsDto)
  // notifications: NotificationsDto;
}

export class CreateOrganizationDto {
  @IsMongoId()
  @IsOptional()
  _id?: mongoose.Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(IDENTIFIER_PATTERN, {
    message: 'Slug must start with a letter and contain only letters, numbers, and underscores',
  })
  slug: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsMongoId()
  @IsString()
  @IsOptional()
  superAdminId?: mongoose.Types.ObjectId;
  // @ValidateNested()
  // @Type(() => SubscriptionDto)
  // subscription: SubscriptionDto;

  @IsOptional()
  @IsString()
  planName: string;

  @IsOptional()
  @IsMongoId()
  subscriptionId?: mongoose.Types.ObjectId;

  @ValidateNested()
  @Type(() => SettingsDto)
  settings: SettingsDto;
}
