import { IsDateString, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { SessionStatus } from '@darnozom/shared-types';

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
