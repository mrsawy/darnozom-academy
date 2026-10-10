import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
  Matches,
  IsUrl,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency, MeetingProvider } from '@lms-organization/shared-types';
import { SessionType } from '../enums/session-type.enum';
import { IsIanaTimeZone } from 'src/utils/validators/is-iana-timezone.validator';

export class SessionPricingDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(Currency)
  currency: Currency;
}

export class AvailableSlotDto {
  @IsDateString()
  date: string;

  /**
   * Accepts 24-hour "HH:mm" (from <input type="time">) or legacy "h:mm am/pm".
   * The server converts date + time + timezone into a UTC instant.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^(([01]?\d|2[0-3]):[0-5]\d|(0?[1-9]|1[0-2]):[0-5]\d\s?(am|pm))$/i, {
    message: 'startTime must be "HH:mm" or "h:mm am/pm"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(([01]?\d|2[0-3]):[0-5]\d|(0?[1-9]|1[0-2]):[0-5]\d\s?(am|pm))$/i, {
    message: 'endTime must be "HH:mm" or "h:mm am/pm"',
  })
  endTime: string;

  /**
   * IANA timezone the slot is authored in (e.g. "Africa/Cairo"). Optional during
   * the migration window; the service applies a default when omitted.
   */
  @IsIanaTimeZone()
  @IsOptional()
  timezone?: string;

  @IsEnum(MeetingProvider)
  @IsOptional()
  provider?: MeetingProvider;

  /** Required only when provider is EXTERNAL_URL (the default). */
  @ValidateIf((o: AvailableSlotDto) => !o.provider || o.provider === MeetingProvider.EXTERNAL_URL)
  @IsUrl()
  @IsOptional()
  meetingUrl?: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxBookings?: number;
}

export class CreatePrivateSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(15)
  duration: number;

  @ValidateNested()
  @Type(() => SessionPricingDto)
  pricing: SessionPricingDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailableSlotDto)
  @IsOptional()
  availableSlots?: AvailableSlotDto[];

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(SessionType)
  sessionType: SessionType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  thumbnailKey?: string;
}
