import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { Currency } from '@darnozom/shared-types';
import { PlanTier } from '../enum/planTier.enum';

class PlanPriceDetailsDto {
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @IsEnum(Currency)
  originalCurrency: Currency;

  @IsNumber()
  @Min(0)
  priceUSD: number;
}

class PriceDto {
  @ValidateNested()
  @Type(() => PlanPriceDetailsDto)
  [BillingCycle.MONTHLY]: PlanPriceDetailsDto;

  @ValidateNested()
  @Type(() => PlanPriceDetailsDto)
  [BillingCycle.YEARLY]: PlanPriceDetailsDto;

  @ValidateNested()
  @Type(() => PlanPriceDetailsDto)
  [BillingCycle.ONE_TIME]: PlanPriceDetailsDto;
}

class FeaturesDto {
  @IsNumber()
  @Min(-1)
  usersPerSubscription: number;

  @IsNumber()
  @Min(-1)
  coursesPerSubscription: number;

  @IsNumber()
  @Min(-1)
  parentAccountsPerSubscription: number;

  @IsNumber()
  @Min(-1)
  pagesPerSubscription: number;

  @IsNumber()
  @Min(-1)
  liveSessionsPerMonth: number;

  @IsNumber()
  @Min(-1)
  assignmentsPerMonth: number;

  @IsNumber()
  @Min(0)
  maxStorageGB: number;

  @IsBoolean()
  courseAnalytics: boolean;

  @IsBoolean()
  contentAnalytics: boolean;

  @IsBoolean()
  moduleAnalytics: boolean;

  @IsBoolean()
  trackingStudentProgress: boolean;

  @IsBoolean()
  prioritySupport: boolean;

  @IsBoolean()
  accessStudentsInfo: boolean;

  @IsBoolean()
  certificates: boolean;

  @IsBoolean()
  customBranding: boolean;

  @IsBoolean()
  inAppChat: boolean;

  @IsBoolean()
  liveSessions: boolean;

  @IsBoolean()
  quizzes: boolean;

  @IsBoolean()
  assignments: boolean;

  @IsBoolean()
  bulkExport: boolean;

  @IsBoolean()
  apiAccess: boolean;

  @IsBoolean()
  whiteLabel: boolean;

  @IsBoolean()
  customDomain: boolean;

  @IsBoolean()
  sso: boolean;

  @IsBoolean()
  attendanceTracking: boolean;

  @IsBoolean()
  dripContent: boolean;

  @IsBoolean()
  gamification: boolean;

  @IsBoolean()
  webhooks: boolean;

  @IsBoolean()
  reporting: boolean;

  @IsBoolean()
  courseTemplates: boolean;

  @IsBoolean()
  multiLanguage: boolean;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => PriceDto)
  price: PriceDto;

  @ValidateNested()
  @Type(() => FeaturesDto)
  features: FeaturesDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsEnum(PlanTier)
  @IsNotEmpty()
  tier: PlanTier;

  @IsString()
  @IsOptional()
  paypalPlanId: string;

  /** Platform tax percentage deducted from each enrollment before crediting the org wallet. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercentage?: number;
}
