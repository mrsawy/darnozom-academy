import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';

export class FindSessionsPayload {
  @IsOptional()
  @IsMongoId()
  groupId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  /** Inclusive lower bound on startsAt (ISO date or date-time). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Exclusive upper bound on startsAt. */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  /** A parent narrows to one child (must be their own). */
  @IsOptional()
  @IsMongoId()
  childId?: string;
}

export class AttendanceEntryDto {
  @IsMongoId()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MarkAttendancePayload {
  @IsMongoId()
  id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class TeacherAttendancePayload {
  @IsMongoId()
  id!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class CancelSessionPayload {
  @IsMongoId()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
