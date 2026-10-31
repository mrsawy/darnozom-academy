import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDate,
  Min,
  Max,
  ValidateIf,
  Validate,
  IsDefined,
  IsArray,
  Matches,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

import { Type, Transform } from 'class-transformer';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { Currency } from '@darnozom/shared-types';
import mongoose from 'mongoose';
import { IsAboveMinPaidPrice } from './validators/is-above-min-paid-price.validator';

@ValidatorConstraint({ name: 'IsAfterStartDate', async: false })
class IsAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: Date, args: ValidationArguments): boolean {
    const dto = args.object as PricingDetailsDto;
    if (!dto.discountStartDate || !endDate) return true;
    return new Date(endDate) > new Date(dto.discountStartDate);
  }

  defaultMessage(): string {
    return 'discountEndDate must be after discountStartDate';
  }
}

@ValidatorConstraint({
  name: 'AtLeastOnePricingWithPriceAndCurrency',
  async: false,
})
class AtLeastOnePricingWithPriceAndCurrency implements ValidatorConstraintInterface {
  validate(pricing: PricingDto, args: ValidationArguments): boolean {
    const obj = args.object as CreateCourseDto;
    if (!obj?.isPaid) return true; // Not required when course is free
    if (!pricing) return false;

    const cycles = [BillingCycle.MONTHLY, BillingCycle.YEARLY, BillingCycle.ONE_TIME];
    return cycles.some((cycle) => {
      const details = pricing?.[cycle];
      return (
        details !== undefined &&
        typeof details.originalPrice === 'number' &&
        !Number.isNaN(details.originalPrice) &&
        details.originalCurrency !== undefined
      );
    });
  }

  defaultMessage(): string {
    return 'pricing must include at least one of monthly, yearly, or one_time with price and currency when isPaid is true';
  }
}
export class PricingDetailsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsAboveMinPaidPrice()
  // only required if currency exists
  @ValidateIf((o: PricingDetailsDto) => o.originalCurrency != null)
  originalPrice?: number;

  @IsOptional()
  @IsEnum(Currency)
  // only required if price exists
  @ValidateIf((o: PricingDetailsDto) => o.originalPrice != null)
  originalCurrency?: Currency;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Validate(IsAfterStartDate)
  discountEndDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  discountStartDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;
}
export class PricingDto {
  @ValidateNested()
  @Type(() => PricingDetailsDto)
  @IsOptional()
  [BillingCycle.MONTHLY]?: PricingDetailsDto;

  @ValidateNested()
  @Type(() => PricingDetailsDto)
  @IsOptional()
  [BillingCycle.YEARLY]?: PricingDetailsDto;

  @ValidateNested()
  @Type(() => PricingDetailsDto)
  @IsOptional()
  [BillingCycle.ONE_TIME]?: PricingDetailsDto;
}

export class SettingsDto {
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @IsNumber()
  @IsOptional()
  enrollmentLimit?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  enrollmentDeadline?: Date;

  @IsBoolean()
  @IsOptional()
  certificateEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  downloadEnabled?: boolean;
}

export class TimeSlotDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i, {
    message: 'startTime must be in format HH:MM am/pm (e.g., 02:00 pm, 11:30 am)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i, {
    message: 'endTime must be in format HH:MM am/pm (e.g., 02:00 pm, 11:30 am)',
  })
  endTime: string;

  @IsString()
  @IsNotEmpty()
  dayOfWeek: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  instructorsIds?: mongoose.Types.ObjectId[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  coInstructorsIds?: mongoose.Types.ObjectId[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  studentsIds?: mongoose.Types.ObjectId[];

  @IsMongoId()
  @IsOptional()
  @ValidateIf((o: TimeSlotDto) => o.moduleId != null)
  moduleId?: mongoose.Types.ObjectId | null;

  @IsString()
  @IsOptional()
  @ValidateIf((o: TimeSlotDto) => o.moduleName != null)
  moduleName?: string | null;
}

export class AttendanceSettingsDto {
  @IsBoolean()
  @IsOptional()
  requireAttendance?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  @IsOptional()
  offlineSchedule?: TimeSlotDto[];
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsMongoId({ each: true })
  @IsOptional()
  categoriesIds?: mongoose.Types.ObjectId[];

  @IsMongoId({ each: true })
  @IsOptional()
  modulesIds?: mongoose.Types.ObjectId[];

  @IsMongoId()
  @IsOptional()
  gradeId?: string | null;

  @IsMongoId({ each: true })
  @IsOptional()
  schoolTypeIds?: string[];

  @IsMongoId()
  @IsOptional()
  instructor?: string;

  @ValidateIf((o: CreateCourseDto) => o.isPaid === true)
  @IsDefined({ message: 'pricing is required when isPaid is true' })
  @Validate(AtLeastOnePricingWithPriceAndCurrency)
  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === undefined ? false : value))
  isPaid?: boolean;

  @IsBoolean()
  @IsOptional()
  isStandalone?: boolean;

  @IsMongoId({ each: true })
  @IsOptional()
  coInstructors?: string[];

  @IsString()
  @IsOptional()
  thumbnailKey: string;

  @IsString()
  @IsOptional()
  trailerKey?: string;

  @ValidateNested()
  @Type(() => SettingsDto)
  @IsOptional()
  settings?: SettingsDto;

  @IsOptional()
  authorization: string;

  @IsString()
  @IsOptional()
  instructorId: string;

  @IsArray()
  @IsOptional()
  coInstructorsIds?: string[];

  @IsArray()
  @IsOptional()
  learningObjectives?: string[];

  @ValidateNested()
  @Type(() => AttendanceSettingsDto)
  @IsOptional()
  attendanceSettings?: AttendanceSettingsDto;
}
