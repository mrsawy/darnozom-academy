import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class TeacherOverviewPayload {
  @IsMongoId()
  id: string;

  /** Inclusive lower bound on the session start. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Exclusive upper bound on the session start. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
