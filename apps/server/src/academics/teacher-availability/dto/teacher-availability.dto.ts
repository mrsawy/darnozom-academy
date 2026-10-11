import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsMongoId, Matches, Max, Min, ValidateNested } from 'class-validator';
import { IsIanaTimeZone } from 'src/utils/validators/is-iana-timezone.validator';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/)
  endTime!: string;
}

export class PutAvailabilityDto {
  @IsIanaTimeZone()
  timezone!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}

export class TeacherIdPayload {
  @IsMongoId()
  teacherId!: string;
}
