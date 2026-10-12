import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GroupPaymentStatus, GroupStatus } from '@darnozom/shared-types';
import { IsIanaTimeZone } from 'src/utils/validators/is-iana-timezone.validator';
import { OptionalNonNull } from '../../common/optional-non-null';

/** Links are rendered as hrefs: absolute http(s) only. */
const WEB_LINK = { protocols: ['http', 'https'], require_protocol: true };

export class ScheduleSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;
}

export class CreateGroupDto {
  @IsMongoId()
  cohortId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule!: ScheduleSlotDto[];

  @IsIanaTimeZone()
  timezone!: string;

  @IsInt()
  @Min(1)
  @Max(500)
  minStudents!: number;

  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents!: number;

  /** null clears the link */
  @IsOptional()
  @IsUrl(WEB_LINK)
  meetingLink?: string | null;

  /** null clears the link */
  @IsOptional()
  @IsUrl(WEB_LINK)
  whatsappGroupLink?: string | null;
}

/** cohortId cannot change; required fields may be omitted but never nulled. */
export class UpdateGroupDto {
  @OptionalNonNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @OptionalNonNull()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];

  @OptionalNonNull()
  @IsIanaTimeZone()
  timezone?: string;

  @OptionalNonNull()
  @IsInt()
  @Min(1)
  @Max(500)
  minStudents?: number;

  @OptionalNonNull()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudents?: number;

  /** null clears the link */
  @IsOptional()
  @IsUrl(WEB_LINK)
  meetingLink?: string | null;

  /** null clears the link */
  @IsOptional()
  @IsUrl(WEB_LINK)
  whatsappGroupLink?: string | null;
}

export class UpdateGroupPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => UpdateGroupDto)
  data!: UpdateGroupDto;
}

export class FindGroupsPayload {
  @IsOptional()
  @IsMongoId()
  cohortId?: string;

  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsMongoId()
  childId?: string;
}

export class CancelGroupPayload {
  @IsMongoId()
  id!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ContentSentPayload {
  @IsMongoId()
  id!: string;

  @IsBoolean()
  done!: boolean;
}

export class StudentCandidatesPayload {
  @IsMongoId()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class GroupStudentPayload {
  @IsMongoId()
  id!: string;

  @IsMongoId()
  studentId!: string;
}

export class PaymentStatusPayload extends GroupStudentPayload {
  @IsEnum(GroupPaymentStatus)
  paymentStatus!: GroupPaymentStatus;
}

export class WhatsappPayload extends GroupStudentPayload {
  @IsBoolean()
  whatsappAdded!: boolean;
}

export class AssignTeacherPayload {
  @IsMongoId()
  id!: string;

  @IsMongoId()
  teacherId!: string;
}
