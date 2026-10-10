import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { RescheduleStatus } from '../enums/reschedule-status.enum';

export class RespondRescheduleDto {
  @IsMongoId()
  bookingId: string;

  @IsEnum([RescheduleStatus.APPROVED, RescheduleStatus.REJECTED])
  action: RescheduleStatus.APPROVED | RescheduleStatus.REJECTED;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
